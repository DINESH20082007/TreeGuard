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
    request_json("POST", "/api/auth/register", {
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role,
    })
    st, res = request_json("POST", "/api/auth/login", {"email": email, "password": password})
    assert st == 200, f"Login failed after register: {res}"
    return res["access_token"], res["user"]["id"]

def create_dummy_report(cit_token, issue_type="fallen", location="Race Course Road, Coimbatore", desc="Test description"):
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    fields = {
        "issue_type": issue_type,
        "location_name": location,
        "description": desc,
        "latitude": "11.0016",
        "longitude": "76.9746",
        "priority": "High",
    }
    files = {"image": ("test_report.png", png_bytes, "image/png")}
    st, created = request_multipart("/api/reports", fields, files, token=cit_token)
    assert st == 201, f"Report creation failed: {created}"
    return created["id"]

def test_all_scenarios():
    print("=================================================================")
    print("TREEGUARD COMPREHENSIVE WORKFLOW & RESOLUTION TEST SUITE")
    print("=================================================================")

    # Setup roles
    cit_token, cit_id = get_or_create_user_token("citizen@treeguard.org", "SecurePassword123!", "Citizen Ramesh", "citizen")
    adm_token, adm_id = get_or_create_user_token("admin@treeguard.org", "SecurePassword123!", "Admin Officer", "admin")
    insp1_token, insp1_id = get_or_create_user_token("inspector@treeguard.org", "SecurePassword123!", "Field Inspector Kumar", "inspector")
    insp2_token, insp2_id = get_or_create_user_token("inspector2@treeguard.org", "SecurePassword123!", "Other Inspector Natarajan", "inspector")

    print("✅ Multi-role authentication verified (Citizen, Admin, 2 Inspectors).")

    # -------------------------------------------------------------
    # SCENARIO 1: Full Lifecycle with Required Physical Work / Maintenance
    # -------------------------------------------------------------
    print("\n-------------------------------------------------------------")
    print("SCENARIO 1: Full Lifecycle with Required Physical Work")
    print("-------------------------------------------------------------")
    rep1_id = create_dummy_report(cit_token, "fallen", "DB Road, RS Puram", "Fallen branch on walkway")
    print(f"1. Created report: {rep1_id}")

    # Check premature completion blocked
    st, err = request_json("POST", f"/api/reports/{rep1_id}/complete", {}, token=adm_token)
    assert st == 400
    print("2. Premature complete blocked (Report pending review).")

    # Mark review complete
    st, r = request_json("POST", f"/api/reports/{rep1_id}/review", {"notes": "Review verified by staff."}, token=adm_token)
    assert st == 200 and r["status"] == "under-review"
    print("3. [ Mark Review Complete ] -> status: under-review.")

    # Assign inspector
    st, r = request_json("POST", f"/api/reports/{rep1_id}/assign", {"inspector_id": insp1_id, "notes": "Please inspect"}, token=adm_token)
    assert st == 200 and r["status"] == "assigned"
    print("4. [ Confirm Assignment ] -> status: assigned.")

    # Start inspection
    st, r = request_json("POST", f"/api/reports/{rep1_id}/start-inspection", {}, token=insp1_token)
    assert st == 200 and r["status"] == "in-progress"
    print("5. [ Start Inspection ] -> status: in-progress.")

    # Complete inspection with service_required=True
    st, r = request_json("POST", f"/api/reports/{rep1_id}/complete-inspection", {
        "condition": "Poor",
        "severity": "High",
        "service_required": True,
        "recommended_action": "Branch pruning and removal"
    }, token=insp1_token)
    assert st == 200 and r["status"] == "service-required"
    print("6. [ Mark Inspection Complete ] (Service Required) -> status: service-required.")

    # Verify complete is blocked until work is done
    st, err = request_json("POST", f"/api/reports/{rep1_id}/complete", {}, token=adm_token)
    assert st == 400
    print("7. Complete blocked (Required physical work pending).")

    # Mark work completed
    st, r = request_json("POST", f"/api/reports/{rep1_id}/complete-work", {
        "work_performed": "Removed fallen tree and cleared the affected area.",
        "completion_notes": "Sidewalk cleared."
    }, token=insp1_token)
    assert st == 200 and r["status"] == "service-completed"
    print("8. [ Mark Work Completed ] -> status: service-completed.")

    # Final Complete Report
    st, r = request_json("POST", f"/api/reports/{rep1_id}/complete", {"notes": "All work verified."}, token=adm_token)
    assert st == 200 and r["status"] == "resolved"
    assert r["resolved_at"] is not None
    print("9. [ COMPLETE REPORT ] confirmed -> status: RESOLVED.")

    # Verify timeline
    for step in r["timeline"]:
        assert step["done"] is True, f"Step '{step['label']}' done is False"
    assert r["timeline"][-1]["label"] == "Report Completed" and r["timeline"][-1]["done"] is True
    print("10. Timeline all steps completed (✓).")

    # -------------------------------------------------------------
    # SCENARIO 2: Full Lifecycle where Inspection finds NO Service Needed
    # -------------------------------------------------------------
    print("\n-------------------------------------------------------------")
    print("SCENARIO 2: Lifecycle without Physical Maintenance Needed")
    print("-------------------------------------------------------------")
    rep2_id = create_dummy_report(cit_token, "health", "Race Course Road Promenade", "Yellow leaves observed")
    print(f"1. Created report: {rep2_id}")

    # Mark review complete
    st, r = request_json("POST", f"/api/reports/{rep2_id}/review", {}, token=adm_token)
    assert st == 200 and r["status"] == "under-review"

    # Assign inspector
    st, r = request_json("POST", f"/api/reports/{rep2_id}/assign", {"inspector_id": insp1_id}, token=adm_token)
    assert st == 200 and r["status"] == "assigned"

    # Start inspection
    st, r = request_json("POST", f"/api/reports/{rep2_id}/start-inspection", {}, token=insp1_token)
    assert st == 200 and r["status"] == "in-progress"

    # Complete inspection with service_required=False
    st, r = request_json("POST", f"/api/reports/{rep2_id}/complete-inspection", {
        "condition": "Good",
        "severity": "Low",
        "service_required": False,
        "notes": "Natural seasonal foliage shedding. Tree structurally sound."
    }, token=insp1_token)
    assert st == 200 and r["status"] == "inspection-completed"
    print("2. [ Mark Inspection Complete ] (No Service Needed) -> status: inspection-completed.")

    # Complete Report
    st, r = request_json("POST", f"/api/reports/{rep2_id}/complete", {"notes": "Inspected and certified healthy."}, token=insp1_token)
    assert st == 200 and r["status"] == "resolved"
    assert r["resolved_at"] is not None
    print("3. [ COMPLETE REPORT ] confirmed by inspector -> status: RESOLVED.")

    # -------------------------------------------------------------
    # SCENARIO 3: Direct Administrative Resolution from Under Review
    # -------------------------------------------------------------
    print("\n-------------------------------------------------------------")
    print("SCENARIO 3: Admin Direct Resolution from Under Review")
    print("-------------------------------------------------------------")
    rep3_id = create_dummy_report(cit_token, "other", "NSR Road, Saibaba Colony", "General inquiry about tree pruning schedule")
    
    st, r = request_json("POST", f"/api/reports/{rep3_id}/review", {"notes": "Inquiry addressed via municipal policy guidelines."}, token=adm_token)
    assert st == 200 and r["status"] == "under-review"

    st, r = request_json("POST", f"/api/reports/{rep3_id}/complete", {"notes": "Handled administratively. Citizen inquiry answered."}, token=adm_token)
    assert st == 200 and r["status"] == "resolved"
    assert r["resolved_at"] is not None
    print("1. [ COMPLETE REPORT ] direct resolution by Admin -> status: RESOLVED.")

    # -------------------------------------------------------------
    # SCENARIO 4: Security & Permissions Enforcement
    # -------------------------------------------------------------
    print("\n-------------------------------------------------------------")
    print("SCENARIO 4: Security & RBAC Enforcement")
    print("-------------------------------------------------------------")
    rep4_id = create_dummy_report(cit_token, "branch", "Cross Cut Road", "Broken branch")

    # Citizen cannot review
    st, _ = request_json("POST", f"/api/reports/{rep4_id}/review", {}, token=cit_token)
    assert st == 403
    print("✅ Citizen review blocked (403).")

    # Citizen cannot assign
    st, _ = request_json("POST", f"/api/reports/{rep4_id}/assign", {"inspector_id": insp1_id}, token=cit_token)
    assert st == 403
    print("✅ Citizen assign blocked (403).")

    # Citizen cannot complete report
    st, _ = request_json("POST", f"/api/reports/{rep4_id}/complete", {}, token=cit_token)
    assert st == 403
    print("✅ Citizen complete report blocked (403).")

    # Assign to Inspector 1
    request_json("POST", f"/api/reports/{rep4_id}/assign", {"inspector_id": insp1_id}, token=adm_token)

    # Inspector 2 cannot start inspection on Inspector 1's report
    st, _ = request_json("POST", f"/api/reports/{rep4_id}/start-inspection", {}, token=insp2_token)
    assert st == 403
    print("✅ Unauthorized inspector start inspection blocked (403).")

    # Inspector 2 cannot complete Inspector 1's report
    st, _ = request_json("POST", f"/api/reports/{rep4_id}/complete", {}, token=insp2_token)
    assert st == 403
    print("✅ Unauthorized inspector complete report blocked (403).")

    # -------------------------------------------------------------
    # SCENARIO 5: Citizen My Reports Persistence & Zero Pending Verification
    # -------------------------------------------------------------
    print("\n-------------------------------------------------------------")
    print("SCENARIO 5: My Reports Verification & Zero Pending State")
    print("-------------------------------------------------------------")
    st, my_reps = request_json("GET", "/api/reports/my", token=cit_token)
    assert st == 200

    rep1_data = next((x for x in my_reps if x["id"] == rep1_id), None)
    assert rep1_data is not None
    assert rep1_data["status"] == "resolved", f"Expected 'resolved', got {rep1_data['status']}"
    assert rep1_data["work_performed"] is not None

    rep2_data = next((x for x in my_reps if x["id"] == rep2_id), None)
    assert rep2_data is not None
    assert rep2_data["status"] == "resolved"

    rep3_data = next((x for x in my_reps if x["id"] == rep3_id), None)
    assert rep3_data is not None
    assert rep3_data["status"] == "resolved"

    print("✅ All completed reports persist as RESOLVED in citizen's My Reports list.")

    print("\n=================================================================")
    print("🎉 ALL 5 COMPREHENSIVE WORKFLOW SCENARIOS PASSED 100%!")
    print("=================================================================")

if __name__ == "__main__":
    test_all_scenarios()
