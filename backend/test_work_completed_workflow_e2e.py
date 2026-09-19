import json
import urllib.request
import urllib.error
import uuid
import io
import sys

BASE_URL = "http://127.0.0.1:8000"

def api_call(method: str, path: str, data: dict = None, token: str = None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else None
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = content
        return e.code, parsed

def upload_emergency_report(token: str, issue_type: str, location_name: str, description: str):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    url = f"{BASE_URL}/api/reports"
    
    # 1x1 transparent PNG
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

    body_io = io.BytesIO()
    
    def add_field(name, value):
        body_io.write(f"--{boundary}\r\n".encode("utf-8"))
        body_io.write(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body_io.write(f"{value}\r\n".encode("utf-8"))

    add_field("issue_type", issue_type)
    add_field("location_name", location_name)
    add_field("description", description)
    add_field("latitude", "11.0286")
    add_field("longitude", "77.0042")
    add_field("observed_at", "7:30 AM today")
    add_field("additional_notes", "Emergency fallen tree blocking roadway")

    # File field
    body_io.write(f"--{boundary}\r\n".encode("utf-8"))
    body_io.write(b'Content-Disposition: form-data; name="image"; filename="emergency.png"\r\n')
    body_io.write(b"Content-Type: image/png\r\n\r\n")
    body_io.write(png_bytes)
    body_io.write(b"\r\n")

    body_io.write(f"--{boundary}--\r\n".encode("utf-8"))
    body_data = body_io.getvalue()

    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {token}",
    }

    req = urllib.request.Request(url, data=body_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def register_or_login(email, password, full_name, role):
    # Try login first
    s, d = api_call("POST", "/api/auth/login", data={"email": email, "password": password})
    if s == 200:
        return d["access_token"]
    
    # Otherwise register
    reg_data = {
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role,
    }
    s_reg, d_reg = api_call("POST", "/api/auth/register", data=reg_data)
    if s_reg not in [200, 201]:
        print(f"Registration notice: {d_reg}")
    
    # Login again
    s_l, d_l = api_call("POST", "/api/auth/login", data={"email": email, "password": password})
    assert s_l == 200, f"Login failed for {email}: {d_l}"
    return d_l["access_token"]

def run_test():
    print("=== Step 1: Login Citizen, Admin, and Field Inspector ===")
    cit_token = register_or_login("citizen.e2e@treeguard.org", "SecurePassword123!", "Karthik Citizen", "citizen")
    adm_token = register_or_login("admin.e2e@treeguard.org", "SecurePassword123!", "Arun Officer", "admin")
    insp_token = register_or_login("inspector.e2e@treeguard.org", "SecurePassword123!", "Priya Field Inspector", "inspector")

    # Get inspector profile ID
    s_me, d_me = api_call("GET", "/api/users/me", token=insp_token)
    assert s_me == 200
    inspector_id = d_me["id"]
    inspector_name = d_me["full_name"]
    print(f"Inspector authenticated: {inspector_name} ({inspector_id})")

    print("\n=== Step 2: Citizen reports fallen tree ===")
    status, report_res = upload_emergency_report(
        token=cit_token,
        issue_type="fallen",
        location_name="Avinashi Road, Peelamedu, Coimbatore",
        description="Fallen tree is completely blocking the lane."
    )
    assert status == 201, f"Report creation failed: {report_res}"
    report_id = report_res["id"]
    print(f"Report submitted: {report_id}")

    print("\n=== Step 3: Admin reviews report and assigns inspector ===")
    s_rev, d_rev = api_call("POST", f"/api/reports/{report_id}/review", data={"notes": "Urgent hazard verified."}, token=adm_token)
    assert s_rev == 200
    assert d_rev["status"] == "under-review"

    assign_payload = {
        "inspector_id": inspector_id,
        "notes": "Emergency limb clearance and chainsaw crew required.",
        "priority": "Emergency"
    }
    s_asn, d_asn = api_call("POST", f"/api/reports/{report_id}/assign", data=assign_payload, token=adm_token)
    assert s_asn == 200
    assert d_asn["status"] == "assigned"
    print(f"Report {report_id} assigned to inspector.")

    print("\n=== Step 4: Inspector starts inspection ===")
    s_asns, d_asns = api_call("GET", "/api/inspector/assignments", token=insp_token)
    assert s_asns == 200
    my_assignment = next((a for a in d_asns if a.get("report_id") == report_id), None)
    assert my_assignment is not None, "Inspector assignment not found!"
    assignment_id = my_assignment["id"]

    s_start, d_start = api_call("PATCH", f"/api/inspector/assignments/{assignment_id}/workflow", data={"action": "start_inspection"}, token=insp_token)
    assert s_start == 200
    assert d_start["inspection_status"] == "In Progress"
    print(f"Inspection started for assignment {assignment_id}.")

    print("\n=== Step 5: Inspector completes inspection (Service Required = True) ===")
    insp_complete_payload = {
        "action": "complete_inspection",
        "condition": "Critical",
        "severity": "High",
        "notes": "Trunk split near utility cable line.",
        "recommended_action": "Emergency limb removal and disposal",
        "service_required": True
    }
    s_ci, d_ci = api_call("PATCH", f"/api/inspector/assignments/{assignment_id}/workflow", data=insp_complete_payload, token=insp_token)
    assert s_ci == 200
    assert d_ci["inspection_status"] == "Inspection Completed"
    assert d_ci["service_required"] is True
    assert d_ci["service_status"] == "Required"

    # Verify report is NOT resolved yet!
    s_rep1, d_rep1 = api_call("GET", f"/api/reports/{report_id}", token=cit_token)
    assert s_rep1 == 200
    assert d_rep1["status"] == "service-required", f"Report must be 'service-required' but was '{d_rep1['status']}'"
    assert d_rep1["resolved_at"] is None, "Report must not have resolved_at yet!"
    print("Verified: Inspection Completed did NOT prematurely resolve the report!")

    print("\n=== Step 6: Inspector performs actual work and marks 'Work Completed' ===")
    work_performed = "Removed fallen branch and cleared the affected area."
    completion_notes = "Area checked after cleanup and no immediate obstruction remains."

    work_payload = {
        "action": "complete_work",
        "service_performed": work_performed,
        "service_notes": completion_notes,
        "work_performed": work_performed,
        "completion_notes": completion_notes
    }
    s_cw, d_cw = api_call("PATCH", f"/api/inspector/assignments/{assignment_id}/workflow", data=work_payload, token=insp_token)
    assert s_cw == 200, f"Complete work failed: {d_cw}"
    assert d_cw["service_status"] == "Service Completed"
    assert d_cw["status"] == "completed"
    assert d_cw["service_completed_at"] is not None
    assert d_cw["service_performed"] == work_performed
    print("Work completion saved to database.")

    print("\n=== Step 7: Citizen View Verification ===")
    s_rep2, d_rep2 = api_call("GET", f"/api/reports/{report_id}", token=cit_token)
    assert s_rep2 == 200
    print(f"Citizen report status: {d_rep2['status']}")
    assert d_rep2["status"] == "resolved", f"Expected 'resolved', got '{d_rep2['status']}'"
    assert d_rep2["resolved_at"] is not None
    assert d_rep2["service_completed_at"] is not None
    assert d_rep2["work_performed"] == work_performed, f"Expected '{work_performed}', got '{d_rep2['work_performed']}'"
    assert d_rep2["completion_notes"] == completion_notes, f"Expected '{completion_notes}', got '{d_rep2['completion_notes']}'"
    assert d_rep2["assigned_inspector_name"] == inspector_name

    # Check timeline
    timeline = d_rep2.get("timeline", [])
    work_step = next((s for s in timeline if s["label"] == "Work Completed"), None)
    assert work_step is not None, "Missing 'Work Completed' in timeline!"
    assert work_step["done"] is True, "'Work Completed' step done is False!"
    print(f"Timeline 'Work Completed' step note: {work_step['note']}")

    resolved_step = next((s for s in timeline if s["label"] in ["Report Completed", "Resolved"]), None)
    assert resolved_step is not None, "Missing 'Report Completed' / 'Resolved' in timeline!"
    assert resolved_step["done"] is True

    # Check status history
    history = d_rep2.get("status_history", [])
    hist_work = next((h for h in history if h["stage_name"] == "Work Completed"), None)
    assert hist_work is not None, "Missing 'Work Completed' in status history!"
    print(f"Status history entry for Work Completed: {hist_work['note']}")

    # Check notifications
    s_notif, d_notif = api_call("GET", "/api/notifications", token=cit_token)
    assert s_notif == 200
    notif_list = d_notif.get("notifications", d_notif) if isinstance(d_notif, dict) else d_notif
    res_notif = next((n for n in notif_list if n.get("related_entity_id") == report_id and n.get("type") == "resolved"), None)
    assert res_notif is not None, "Citizen did not receive resolved notification!"
    print(f"Citizen Notification: {res_notif['title']} - {res_notif['message']}")

    # Check My Reports
    s_my, d_my = api_call("GET", "/api/reports/my", token=cit_token)
    assert s_my == 200
    my_rep = next((r for r in d_my if r["id"] == report_id), None)
    assert my_rep is not None
    assert my_rep["status"] == "resolved"
    assert my_rep["work_performed"] == work_performed

    print("\n=======================================================")
    print("[SUCCESS] E2E FIELD INSPECTOR WORK COMPLETED VERIFICATION SUCCESS!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_test()
