import json
import os
import sys
import uuid
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def log_pass(msg: str):
    print(f"  \033[92m[PASS]\033[0m {msg}")

def log_fail(msg: str):
    print(f"  \033[91m[FAIL]\033[0m {msg}")

def log_step(title: str):
    print(f"\n\033[94m{title}\033[0m")

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
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    url = f"{BASE_URL}{path}"
    body = bytearray()

    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{v}\r\n".encode("utf-8"))

    for k, (filename, file_bytes, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(file_bytes)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=bytes(body), headers=headers, method="POST")
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

def main():
    print("=================================================================")
    print("RUNNING TREEGUARD FRONTEND-BACKEND INTEGRATION TEST SUITE")
    print("=================================================================")

    # Step 1: Health Check
    log_step("[STEP 1] Testing Backend Health Check...")
    status, body = request_json("GET", "/api/health")
    assert status == 200, f"Health check failed with {status}"
    log_pass(f"Backend health check OK: {body.get('service')}")

    # Step 2: Register & Authenticate Citizen, Inspector, Admin
    log_step("[STEP 2] Authenticating Roles (Citizen, Inspector, Admin)...")
    suffix = uuid.uuid4().hex[:6]

    # Citizen
    c_email = f"integ_cit_{suffix}@treeguard.org"
    c_pwd = "Password123!"
    st, _ = request_json("POST", "/api/auth/register", {
        "email": c_email,
        "password": c_pwd,
        "full_name": "Integration Citizen",
        "role": "citizen"
    })
    assert st == 201, f"Citizen reg failed: {st}"
    st, c_login = request_json("POST", "/api/auth/login", {"email": c_email, "password": c_pwd})
    assert st == 200, f"Citizen login failed: {st}"
    c_token = c_login["access_token"]
    log_pass(f"Citizen authenticated: {c_email}")

    # Inspector
    i_email = f"integ_insp_{suffix}@treeguard.org"
    i_pwd = "Password123!"
    st, _ = request_json("POST", "/api/auth/register", {
        "email": i_email,
        "password": i_pwd,
        "full_name": "Integration Inspector",
        "role": "inspector"
    })
    assert st == 201, f"Inspector reg failed: {st}"
    st, i_login = request_json("POST", "/api/auth/login", {"email": i_email, "password": i_pwd})
    assert st == 200, f"Inspector login failed: {st}"
    i_token = i_login["access_token"]
    log_pass(f"Inspector authenticated: {i_email}")

    # Admin
    a_email = f"integ_adm_{suffix}@treeguard.org"
    a_pwd = "Password123!"
    st, _ = request_json("POST", "/api/auth/register", {
        "email": a_email,
        "password": a_pwd,
        "full_name": "Integration Admin",
        "role": "admin"
    })
    assert st == 201, f"Admin reg failed: {st}"
    st, a_login = request_json("POST", "/api/auth/login", {"email": a_email, "password": a_pwd})
    assert st == 200, f"Admin login failed: {st}"
    a_token = a_login["access_token"]
    log_pass(f"Admin authenticated: {a_email}")

    # Step 3: Monitoring Dashboard API & Role Permissions
    log_step("[STEP 3] Testing GET /api/admin/monitoring Access Control & Payload...")
    # Unauthenticated -> 401
    st, _ = request_json("GET", "/api/admin/monitoring")
    assert st == 401, f"Expected 401, got {st}"
    log_pass("Unauthenticated monitoring request correctly rejected with 401.")

    # Citizen -> 403
    st, _ = request_json("GET", "/api/admin/monitoring", token=c_token)
    assert st == 403, f"Expected 403, got {st}"
    log_pass("Citizen access to monitoring correctly rejected with 403.")

    # Inspector -> 200 (allowed)
    st, insp_mon = request_json("GET", "/api/admin/monitoring", token=i_token)
    assert st == 200, f"Expected 200 for inspector, got {st}"
    log_pass("Inspector can access monitoring dashboard.")

    # Admin -> 200
    st, adm_mon = request_json("GET", "/api/admin/monitoring", token=a_token)
    assert st == 200, f"Expected 200 for admin, got {st}"
    assert "summary_cards" in adm_mon
    assert "health_trend" in adm_mon
    assert "plan_status" in adm_mon
    assert "upcoming_reinspections" in adm_mon
    assert len(adm_mon["summary_cards"]) == 6
    log_pass(f"Admin monitoring dashboard payload validated (6 summary cards, {len(adm_mon['health_trend'])} health trend intervals).")

    # Step 4: Inspector Assignment Completion Workflow
    log_step("[STEP 4] Testing Inspector Assignment Completion (POST /api/inspector/assignments/{id}/complete)...")
    st, assignments = request_json("GET", "/api/inspector/assignments", token=i_token)
    assert st == 200
    assert len(assignments) > 0, "No seeded assignments found"
    target_assignment = assignments[0]
    log_pass(f"Found active assignment {target_assignment['id']} (Status: {target_assignment['status']})")

    complete_payload = {
        "condition": "Fair",
        "severity": "Moderate",
        "notes": "Field inspection conducted. Pruned damaged lower branch.",
        "recommended_action": "Yes — within 14 days"
    }
    st, updated = request_json("POST", f"/api/inspector/assignments/{target_assignment['id']}/complete", complete_payload, token=i_token)
    assert st == 200, f"Complete assignment failed: {st}, {updated}"
    assert updated["status"] == "completed"
    assert updated["completed_at"] is not None
    log_pass(f"Assignment {target_assignment['id']} completed and saved to PostgreSQL.")

    # Re-fetch single assignment
    st, get_single = request_json("GET", f"/api/inspector/assignments/{target_assignment['id']}", token=i_token)
    assert st == 200
    assert get_single["status"] == "completed"
    log_pass(f"Verified assignment {target_assignment['id']} persistence via GET endpoint.")

    # Citizen cannot complete assignment (403)
    st, _ = request_json("POST", f"/api/inspector/assignments/{target_assignment['id']}/complete", complete_payload, token=c_token)
    assert st == 403
    log_pass("Citizen forbidden from completing inspector assignments (403).")

    # Non-existent assignment ID -> 404
    st, _ = request_json("POST", "/api/inspector/assignments/ASN-NONEXISTENT-9999/complete", complete_payload, token=i_token)
    assert st == 404
    log_pass("Non-existent assignment returned 404.")

    # Step 5: Trees, Reports, Observations, Recovery Plans End-to-End
    log_step("[STEP 5] Testing Trees & Citizen Reports End-to-End Flow...")
    st, trees = request_json("GET", "/api/trees", token=c_token)
    assert st == 200
    assert len(trees) > 0
    first_tree = trees[0]
    log_pass(f"Retrieved {len(trees)} trees from registry. Selected: {first_tree['id']} ({first_tree['species']})")

    st, tree_det = request_json("GET", f"/api/trees/{first_tree['id']}", token=c_token)
    assert st == 200
    assert tree_det["id"] == first_tree["id"]
    log_pass(f"Tree detail GET verified for {first_tree['id']}.")

    st, tree_risk = request_json("GET", f"/api/trees/{first_tree['id']}/risk", token=c_token)
    assert st == 200
    log_pass(f"Tree risk GET verified for {first_tree['id']}.")

    # Non-existent tree -> 404
    st, _ = request_json("GET", "/api/trees/TRE-NONEXISTENT", token=c_token)
    assert st == 404
    log_pass("Non-existent tree returned 404.")

    # Create Report
    dummy_jpg = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
        b"\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f"
        b"\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b"
        b"\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    )
    st, rep = request_multipart(
        "/api/reports",
        fields={
            "issue_type": "branch",
            "location_name": "Test Integration Park",
            "description": "Integration test report broken branch",
            "latitude": "37.7792",
            "longitude": "-122.4185",
        },
        files={"image": ("test.jpg", dummy_jpg, "image/jpeg")},
        token=c_token
    )
    assert st == 201, f"Report creation failed: {st}, {rep}"
    log_pass(f"Report created with ID: {rep['id']}")

    # Retrieve Report Detail
    st, rep_det = request_json("GET", f"/api/reports/{rep['id']}", token=c_token)
    assert st == 200
    assert rep_det["id"] == rep["id"]
    log_pass(f"Report detail retrieved: {rep['id']}")

    # Non-existent report -> 404
    st, _ = request_json("GET", "/api/reports/TRG-NONEXISTENT-9999", token=c_token)
    assert st == 404
    log_pass("Non-existent report returned 404.")

    # Step 6: Test Notifications Read / Unread
    log_step("[STEP 6] Testing Notifications System...")
    st, notifs = request_json("GET", "/api/notifications", token=c_token)
    assert st == 200
    st, unread_res = request_json("GET", "/api/notifications/unread-count", token=c_token)
    assert st == 200
    log_pass(f"Notifications listed and unread count: {unread_res.get('unread_count', 0)}")

    print("\n=================================================================")
    print(" ALL FRONTEND-BACKEND INTEGRATION TESTS PASSED (100%)!")
    print("=================================================================\n")

if __name__ == "__main__":
    main()
