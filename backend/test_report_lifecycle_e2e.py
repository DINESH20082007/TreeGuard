import json
import urllib.request
import urllib.error
import uuid
import io

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

def upload_report(token: str, issue_type: str, location_name: str, description: str):
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
    add_field("latitude", "11.0168")
    add_field("longitude", "76.9558")
    
    # File field
    body_io.write(f"--{boundary}\r\n".encode("utf-8"))
    body_io.write(b'Content-Disposition: form-data; name="image"; filename="tree.png"\r\n')
    body_io.write(b"Content-Type: image/png\r\n\r\n")
    body_io.write(png_bytes)
    body_io.write(b"\r\n")
    body_io.write(f"--{boundary}--\r\n".encode("utf-8"))
    
    req = urllib.request.Request(
        url,
        data=body_io.getvalue(),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {token}"
        },
        method="POST"
    )
    
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def test_report_lifecycle():
    print("==================================================================")
    print("STARTING REPORT LIFECYCLE & WORKFLOW COMPLETION INTEGRATION TEST")
    print("==================================================================")

    uid = uuid.uuid4().hex[:6]
    citizen_email = f"cit_report_{uid}@example.com"
    inspector_email = f"insp_report_{uid}@treeguard.org"
    admin_email = f"adm_report_{uid}@treeguard.org"
    password = "SecurePassword123!"

    # 1. Register Citizen, Inspector, Admin
    api_call("POST", "/api/auth/register", {"email": citizen_email, "password": password, "full_name": f"Citizen {uid}", "role": "citizen"})
    api_call("POST", "/api/auth/register", {"email": inspector_email, "password": password, "full_name": f"Arborist Inspector {uid}", "role": "inspector"})
    api_call("POST", "/api/auth/register", {"email": admin_email, "password": password, "full_name": f"Admin Director {uid}", "role": "admin"})

    _, cit_auth = api_call("POST", "/api/auth/login", {"email": citizen_email, "password": password})
    cit_token = cit_auth["access_token"]
    _, insp_auth = api_call("POST", "/api/auth/login", {"email": inspector_email, "password": password})
    insp_token = insp_auth["access_token"]
    inspector_user_id = insp_auth["user"]["id"]
    _, adm_auth = api_call("POST", "/api/auth/login", {"email": admin_email, "password": password})
    adm_token = adm_auth["access_token"]

    print("[PASS] 3 Roles registered and authenticated.")

    # ==================================================================
    # SCENARIO 1: REPORT WITH SERVICE / MAINTENANCE REQUIRED
    # ==================================================================
    print("\n--- SCENARIO 1: Full Lifecycle with Tree Maintenance Required ---")

    # Step 1: Citizen creates a report
    code, new_rep = upload_report(cit_token, "branch", "Race Course Road, Coimbatore", "Large broken branch hanging over footpath")
    assert code == 201
    report_id = new_rep["id"]
    assert new_rep["status"] == "pending"
    print(f"[PASS] Step 1: Report {report_id} submitted as 'pending'.")

    # Verify initial status and history in database
    code, rep_detail = api_call("GET", f"/api/reports/{report_id}", token=cit_token)
    assert code == 200
    assert rep_detail["status"] == "pending"
    assert len(rep_detail["status_history"]) >= 2
    assert rep_detail["status_history"][0]["stage_name"] == "Submitted"
    assert rep_detail["status_history"][1]["stage_name"] == "AI Telemetry Assessment"
    print("[PASS] Step 1 Verification: Initial status history entries verified in DB.")

    # Step 2: Staff reviews the report
    code, rev_rep = api_call("POST", f"/api/reports/{report_id}/review", {"notes": "Verified hazard coordinates at Race Course Road."}, token=adm_token)
    assert code == 200
    assert rev_rep["status"] == "under-review"
    print(f"[PASS] Step 2: Report {report_id} reviewed and transitioned to 'under-review'.")

    # Step 3: Assign Inspector to Report
    code, asn_rep = api_call("POST", f"/api/reports/{report_id}/assign", {
        "inspector_id": inspector_user_id,
        "notes": "Urgent inspection required. Verify clearance above sidewalk.",
        "priority": "High",
    }, token=adm_token)
    assert code == 200
    assert asn_rep["status"] == "assigned"
    assert asn_rep["assigned_inspector_name"] == f"Arborist Inspector {uid}"
    print(f"[PASS] Step 3: Inspector assigned to report {report_id}, status: 'assigned'.")

    # Inspector fetches their assignments to find the linked work order
    code, assignments = api_call("GET", "/api/inspector/assignments", token=insp_token)
    assert code == 200
    target_asn = next((a for a in assignments if a["report_id"] == report_id), None)
    assert target_asn is not None, "Inspector should have received the assigned work order."
    assignment_id = target_asn["id"]
    print(f"[PASS] Step 3 Verification: Linked assignment {assignment_id} found in inspector queue.")

    # Step 4: Inspector starts inspection
    code, insp_up1 = api_call("PATCH", f"/api/inspector/assignments/{assignment_id}/workflow", {
        "action": "start_inspection"
    }, token=insp_token)
    assert code == 200
    assert insp_up1["inspection_status"] == "In Progress"

    # Verify report status updated for Citizen
    code, rep_detail = api_call("GET", f"/api/reports/{report_id}", token=cit_token)
    assert code == 200
    assert rep_detail["status"] == "in-progress"
    print(f"[PASS] Step 4: Inspector started inspection -> Report {report_id} status updated to 'in-progress'.")

    # Step 5: Inspector completes inspection with service_required=True
    code, insp_up2 = api_call("PATCH", f"/api/inspector/assignments/{assignment_id}/workflow", {
        "action": "complete_inspection",
        "condition": "Poor",
        "severity": "High",
        "recommended_action": "Branch pruning and crown thinning required",
        "service_required": True,
        "service_status": "Required",
        "notes": "Branch split confirmed. Pruning crew dispatched.",
    }, token=insp_token)
    assert code == 200
    assert insp_up2["inspection_status"] == "Inspection Completed"
    assert insp_up2["service_status"] == "Required"

    # Verify report is now 'service-required' and not yet resolved
    code, rep_detail = api_call("GET", f"/api/reports/{report_id}", token=cit_token)
    assert code == 200
    assert rep_detail["status"] == "service-required"
    assert any(h["stage_name"] == "Inspection Completed" for h in rep_detail["status_history"])
    assert any(h["stage_name"] == "Service Required" for h in rep_detail["status_history"])
    print(f"[PASS] Step 5: Inspection completed -> Report {report_id} accurately moved to 'service-required'.")

    # Step 6: Inspector starts maintenance service
    code, insp_up3 = api_call("PATCH", f"/api/inspector/assignments/{assignment_id}/workflow", {
        "action": "start_service"
    }, token=insp_token)
    assert code == 200
    assert insp_up3["service_status"] == "Service In Progress"

    # Verify report is 'service-in-progress'
    code, rep_detail = api_call("GET", f"/api/reports/{report_id}", token=cit_token)
    assert code == 200
    assert rep_detail["status"] == "service-in-progress"
    print(f"[PASS] Step 6: Service started -> Report {report_id} updated to 'service-in-progress'.")

    # Step 7: Inspector completes service
    code, insp_up4 = api_call("PATCH", f"/api/inspector/assignments/{assignment_id}/workflow", {
        "action": "complete_service",
        "service_performed": "Pruned 3 hazardous overhanging branches and treated bark split",
        "service_notes": "Sidewalk cleared, crown stabilized",
    }, token=insp_token)
    assert code == 200
    assert insp_up4["service_status"] == "Service Completed"
    assert insp_up4["status"] == "completed"

    # Verify report is now 'resolved'
    code, rep_detail = api_call("GET", f"/api/reports/{report_id}", token=cit_token)
    assert code == 200
    assert rep_detail["status"] == "resolved"
    assert rep_detail["resolved_at"] is not None
    assert any(h["stage_name"] in ["Work Completed", "Service Completed"] for h in rep_detail["status_history"])
    assert any(h["stage_name"] == "Resolved" for h in rep_detail["status_history"])

    # Verify timeline
    timeline = rep_detail["timeline"]
    assert len(timeline) >= 6
    assert all(step["done"] for step in timeline)
    print(f"[PASS] Step 7: Service completed -> Report {report_id} officially RESOLVED in database!")
    print(f"       Timeline steps verified: {[s['label'] for s in timeline]}")

    # ==================================================================
    # SCENARIO 2: REPORT WITHOUT SERVICE (Inspection Completed -> Resolved)
    # ==================================================================
    print("\n--- SCENARIO 2: Direct Resolution when No Maintenance is Needed ---")

    code, new_rep2 = upload_report(cit_token, "health", "Saibaba Colony, Coimbatore", "Minor leaf yellowing observed")
    assert code == 201
    report_id2 = new_rep2["id"]

    # Review & assign
    api_call("POST", f"/api/reports/{report_id2}/review", token=adm_token)
    api_call("POST", f"/api/reports/{report_id2}/assign", {"inspector_id": inspector_user_id}, token=adm_token)

    code, assignments = api_call("GET", "/api/inspector/assignments", token=insp_token)
    target_asn2 = next(a for a in assignments if a["report_id"] == report_id2)
    assignment_id2 = target_asn2["id"]

    # Inspector starts and completes inspection with service_required=False
    api_call("PATCH", f"/api/inspector/assignments/{assignment_id2}/workflow", {"action": "start_inspection"}, token=insp_token)
    code, insp_res2 = api_call("PATCH", f"/api/inspector/assignments/{assignment_id2}/workflow", {
        "action": "complete_inspection",
        "condition": "Good",
        "severity": "Low",
        "service_required": False,
        "notes": "Normal seasonal shedding. Tree is healthy, no maintenance required.",
    }, token=insp_token)
    assert code == 200
    assert insp_res2["inspection_status"] == "Inspection Completed"
    assert insp_res2["service_status"] == "Not Required"
    assert insp_res2["status"] == "completed"

    # Verify report is directly resolved
    code, rep_detail2 = api_call("GET", f"/api/reports/{report_id2}", token=cit_token)
    assert code == 200
    assert rep_detail2["status"] == "resolved"
    assert rep_detail2["resolved_at"] is not None
    print(f"[PASS] Scenario 2: Report {report_id2} transitioned directly from Inspection Completed to RESOLVED.")

    # Check My Reports for Citizen
    code, my_reps = api_call("GET", "/api/reports/my", token=cit_token)
    assert code == 200
    assert len(my_reps) >= 2
    r1 = next(r for r in my_reps if r["id"] == report_id)
    r2 = next(r for r in my_reps if r["id"] == report_id2)
    assert r1["status"] == "resolved"
    assert r2["status"] == "resolved"
    print("[PASS] Citizen's My Reports correctly displays all real statuses.")

    print("\n==================================================================")
    print("ALL REPORT LIFECYCLE & WORKFLOW COMPLETION REQUIREMENTS PASSED 100%")
    print("==================================================================")

if __name__ == "__main__":
    test_report_lifecycle()
