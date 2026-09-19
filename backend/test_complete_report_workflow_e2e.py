import json
import sys
import uuid
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def request_json(method: str, path: str, data: dict = None, token: str = None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed

def request_multipart(path: str, fields: dict, files: dict, token: str = None):
    url = f"{BASE_URL}{path}"
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body_bytes = bytearray()

    for k, v in fields.items():
        body_bytes.extend(f"--{boundary}\r\n".encode("utf-8"))
        body_bytes.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body_bytes.extend(f"{v}\r\n".encode("utf-8"))

    for k, (filename, file_content, content_type) in files.items():
        body_bytes.extend(f"--{boundary}\r\n".encode("utf-8"))
        body_bytes.extend(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode("utf-8"))
        body_bytes.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body_bytes.extend(file_content)
        body_bytes.extend(b"\r\n")

    body_bytes.extend(f"--{boundary}--\r\n".encode("utf-8"))

    headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=bytes(body_bytes), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed

def get_or_create_user_token(email: str, password: str, full_name: str, role: str):
    st, res = request_json("POST", "/api/auth/login", {"email": email, "password": password})
    if st == 200:
        return res["access_token"], res["user"]["id"]
    # Register user
    reg_st, reg_res = request_json("POST", "/api/auth/register", {
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role,
    })
    st, res = request_json("POST", "/api/auth/login", {"email": email, "password": password})
    assert st == 200, f"Login failed after register: {res}"
    return res["access_token"], res["user"]["id"]

def test_complete_report_lifecycle():
    print("==================================================")
    print("1. AUTHENTICATION & MULTI-ROLE SETUP")
    print("==================================================")
    cit_token, cit_id = get_or_create_user_token("citizen@treeguard.org", "SecurePassword123!", "Citizen Ramesh", "citizen")
    print(f"✅ Citizen authenticated (ID: {cit_id}).")

    adm_token, adm_id = get_or_create_user_token("admin@treeguard.org", "SecurePassword123!", "Admin Officer", "admin")
    print(f"✅ Organization Admin authenticated (ID: {adm_id}).")

    insp1_token, insp1_id = get_or_create_user_token("inspector@treeguard.org", "SecurePassword123!", "Field Inspector Kumar", "inspector")
    print(f"✅ Primary Inspector authenticated (ID: {insp1_id}).")

    insp2_token, insp2_id = get_or_create_user_token("inspector2@treeguard.org", "SecurePassword123!", "Other Inspector Natarajan", "inspector")
    print(f"✅ Secondary Inspector authenticated (ID: {insp2_id}).")

    # Check Inspectors List API
    st, insp_list = request_json("GET", "/api/reports/inspectors/list", token=adm_token)
    assert st == 200, f"Inspectors list API failed: {insp_list}"
    assert len(insp_list) > 0, "Inspectors list is empty"
    print(f"✅ Inspectors list API verified: returned {len(insp_list)} available inspectors.")

    print("\n==================================================")
    print("2. CREATE REPORT AS CITIZEN")
    print("==================================================")
    # 1x1 PNG bytes
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    fields = {
        "issue_type": "fallen",
        "location_name": "Race Course Road, Coimbatore",
        "description": "Large fallen tree branch obstructing pedestrian sidewalk and cycling track.",
        "latitude": "11.0016",
        "longitude": "76.9746",
        "priority": "High",
    }
    files = {
        "image": ("tree_report.png", png_bytes, "image/png"),
    }
    st, created_rep = request_multipart("/api/reports", fields, files, token=cit_token)
    assert st == 201, f"Report creation failed: {created_rep}"
    report_id = created_rep["id"]
    print(f"✅ Report created: ID={report_id}, initial status={created_rep['status']}")

    # Verify initial details & timeline
    st, rep = request_json("GET", f"/api/reports/{report_id}", token=cit_token)
    assert st == 200, f"Get report failed: {rep}"
    assert rep["status"] == "pending", f"Expected 'pending', got {rep['status']}"
    assert len(rep["timeline"]) >= 5
    assert rep["timeline"][0]["label"] == "Submitted" and rep["timeline"][0]["done"] == True
    assert rep["timeline"][-1]["label"] == "Complete Report" and rep["timeline"][-1]["done"] == False
    print(f"✅ Initial report timeline verified: Submitted=Done, Final Step='{rep['timeline'][-1]['label']}' (Pending), Status={rep['status']}")

    print("\n==================================================")
    print("3. SECURITY VALIDATION: CITIZEN RESTRICTIONS")
    print("==================================================")
    st, res = request_json("POST", f"/api/reports/{report_id}/review", {}, token=cit_token)
    assert st == 403, f"Citizen review should be forbidden (403), got {st}"

    st, res = request_json("POST", f"/api/reports/{report_id}/assign", {"inspector_id": insp1_id}, token=cit_token)
    assert st == 403, f"Citizen assign should be forbidden (403), got {st}"

    st, res = request_json("POST", f"/api/reports/{report_id}/complete", {}, token=cit_token)
    assert st == 403, f"Citizen complete report should be forbidden (403), got {st}"
    print("✅ RBAC security verified: Citizen cannot perform operational steps.")

    print("\n==================================================")
    print("4. WORKFLOW VALIDATION: PREMATURE RESOLUTION REJECTED")
    print("==================================================")
    st, res = request_json("POST", f"/api/reports/{report_id}/complete", {}, token=adm_token)
    assert st == 400, f"Premature complete should return 400 Bad Request, got {st}"
    print(f"✅ Premature complete rejected by backend validation: {res.get('detail')}")

    print("\n==================================================")
    print("5. STEP: UNDER REVIEW [ Mark Review Complete ]")
    print("==================================================")
    st, rev_rep = request_json(
        "POST",
        f"/api/reports/{report_id}/review",
        {"notes": "Municipal staff reviewed report image and confirmed Race Course coordinates."},
        token=adm_token
    )
    assert st == 200, f"Review failed: {rev_rep}"
    assert rev_rep["status"] == "under-review", f"Expected 'under-review', got {rev_rep['status']}"
    assert rev_rep["reviewed_at"] is not None
    print(f"✅ Under Review completed: status={rev_rep['status']}, reviewed_at={rev_rep['reviewed_at']}")

    print("\n==================================================")
    print("6. STEP: INSPECTOR ASSIGNMENT [ Confirm Assignment ]")
    print("==================================================")
    st, asn_rep = request_json(
        "POST",
        f"/api/reports/{report_id}/assign",
        {
            "inspector_id": insp1_id,
            "notes": "Clear fallen tree and restore pedestrian access.",
            "priority": "High"
        },
        token=adm_token
    )
    assert st == 200, f"Assign failed: {asn_rep}"
    assert asn_rep["status"] == "assigned", f"Expected 'assigned', got {asn_rep['status']}"
    assert asn_rep["assigned_inspector_id"] == insp1_id
    assert asn_rep["assigned_at"] is not None
    print(f"✅ Inspector Assigned completed: assigned to {asn_rep['assigned_inspector_name']}, status={asn_rep['status']}")

    print("\n==================================================")
    print("7. SECURITY VALIDATION: UNAUTHORIZED INSPECTOR RESTRICTIONS")
    print("==================================================")
    # Secondary inspector attempts to start inspection on insp1's assignment
    st, res = request_json("POST", f"/api/reports/{report_id}/start-inspection", {}, token=insp2_token)
    assert st == 403, f"Unauthorized inspector start inspection should be 403, got {st}"

    # Secondary inspector attempts to complete report
    st, res = request_json("POST", f"/api/reports/{report_id}/complete", {}, token=insp2_token)
    assert st == 403, f"Unauthorized inspector complete should be 403, got {st}"
    print("✅ Authorization verified: Unauthorized inspector cannot modify another inspector's assignment.")

    print("\n==================================================")
    print("8. STEP: START INSPECTION [ Start Inspection ]")
    print("==================================================")
    st, start_rep = request_json(
        "POST",
        f"/api/reports/{report_id}/start-inspection",
        {"notes": "Field inspector arrived on site with safety equipment."},
        token=insp1_token
    )
    assert st == 200, f"Start inspection failed: {start_rep}"
    assert start_rep["status"] == "in-progress", f"Expected 'in-progress', got {start_rep['status']}"
    assert start_rep["inspection_started_at"] is not None
    print(f"✅ Start Inspection completed: status={start_rep['status']}, started_at={start_rep['inspection_started_at']}")

    print("\n==================================================")
    print("9. STEP: COMPLETE INSPECTION [ Mark Inspection Complete ]")
    print("==================================================")
    st, insp_comp_rep = request_json(
        "POST",
        f"/api/reports/{report_id}/complete-inspection",
        {
            "condition": "Poor",
            "severity": "High",
            "notes": "Large branch cracked from main stem and collapsed across walkway.",
            "recommended_action": "Branch removal and canopy pruning",
            "service_required": True
        },
        token=insp1_token
    )
    assert st == 200, f"Complete inspection failed: {insp_comp_rep}"
    assert insp_comp_rep["status"] == "service-required", f"Expected 'service-required', got {insp_comp_rep['status']}"
    assert insp_comp_rep["inspection_completed_at"] is not None
    print(f"✅ Inspection Completed recorded: status={insp_comp_rep['status']}, service_required=True")

    print("\n==================================================")
    print("10. WORKFLOW VALIDATION: PRE-WORK COMPLETION REJECTED")
    print("==================================================")
    st, res = request_json("POST", f"/api/reports/{report_id}/complete", {}, token=adm_token)
    assert st == 400, f"Complete before required service work should return 400 Bad Request, got {st}"
    print(f"✅ Backend validation successfully blocked premature complete: {res.get('detail')}")

    print("\n==================================================")
    print("11. STEP: WORK COMPLETED [ Mark Work Completed ]")
    print("==================================================")
    work_text = "Cut and cleared fallen banyan branch, removed debris, and swept the sidewalk."
    st, work_rep = request_json(
        "POST",
        f"/api/reports/{report_id}/complete-work",
        {
            "work_performed": work_text,
            "completion_notes": "Sidewalk and cycling track fully cleared and certified safe."
        },
        token=insp1_token
    )
    assert st == 200, f"Complete work failed: {work_rep}"
    assert work_rep["status"] == "service-completed", f"Expected 'service-completed', got {work_rep['status']}"
    assert work_rep["work_performed"] == work_text
    assert work_rep["service_completed_at"] is not None
    print(f"✅ Work Completed recorded: status={work_rep['status']}, work_performed='{work_rep['work_performed']}'")

    print("\n==================================================")
    print("12. STEP: FINAL [ COMPLETE REPORT ]")
    print("==================================================")
    st, final_rep = request_json(
        "POST",
        f"/api/reports/{report_id}/complete",
        {"notes": "All required inspection, physical work, and site clearance verified. Case officially resolved."},
        token=adm_token
    )
    assert st == 200, f"Final complete report failed: {final_rep}"
    assert final_rep["status"] == "resolved", f"CRITICAL ERROR: Status is not 'resolved', got {final_rep['status']}"
    assert final_rep["resolved_at"] is not None, "CRITICAL ERROR: resolved_at timestamp is missing"
    print(f"✅ FINAL REPORT RESOLUTION CONFIRMED: Status = '{final_rep['status'].upper()}'")
    print(f"✅ Resolved Timestamp = {final_rep['resolved_at']}")

    print("\n==================================================")
    print("13. VERIFY TIMELINE & STATUS HISTORY AUDIT LOG")
    print("==================================================")
    print("Timeline Steps:")
    for step in final_rep["timeline"]:
        print(f"  - [{step['status'].upper()}] {step['label']} (done={step['done']}): date={step['date']}")
        assert step["done"] == True, f"Step '{step['label']}' done should be True"

    final_timeline_step = final_rep["timeline"][-1]
    assert final_timeline_step["label"] == "Report Completed", f"Expected final step label 'Report Completed', got '{final_timeline_step['label']}'"
    assert final_timeline_step["done"] == True
    assert final_timeline_step["status"] == "completed"

    print("\nStatus History Audit Log:")
    stages = [h["stage_name"] for h in final_rep["status_history"]]
    for h in final_rep["status_history"]:
        print(f"  - {h['stage_name']} ({h['status']}) at {h['created_at']}: {h['note']}")
    assert "Submitted" in stages
    assert "Under Review" in stages
    assert "Inspector Assigned" in stages
    assert "Inspection Completed" in stages
    assert "Work Completed" in stages
    assert "Report Completed" in stages

    print("\n==================================================")
    print("14. DATABASE PERSISTENCE & CITIZEN MY REPORTS VERIFICATION")
    print("==================================================")
    st, my_reports = request_json("GET", "/api/reports/my", token=cit_token)
    assert st == 200, f"My reports failed: {my_reports}"
    matched = next((r for r in my_reports if r["id"] == report_id), None)
    assert matched is not None, f"Report {report_id} not found in citizen's reports list"
    assert matched["status"] == "resolved", f"Report in My Reports has status {matched['status']} instead of 'resolved'"
    assert matched["work_performed"] == work_text
    print("✅ Persistence confirmed: My Reports displays the report with status RESOLVED and recorded work performed.")

    st, single_rep = request_json("GET", f"/api/reports/{report_id}", token=cit_token)
    assert st == 200
    assert single_rep["status"] == "resolved"
    assert single_rep["resolved_at"] is not None
    print("✅ Re-fetch confirmed: Single report API returns status RESOLVED with zero pending flags.")

    print("\n==================================================")
    print("🎉 ALL 14 TEST PHASES PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    test_complete_report_lifecycle()
