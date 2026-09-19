import json
import urllib.request
import urllib.error
import time
import os
import io
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None and not isinstance(data, (bytes, bytearray)):
        data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            resp_headers = dict(resp.headers)
            try:
                json_data = json.loads(body)
            except Exception:
                json_data = body
            return resp.status, json_data, resp_headers
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        resp_headers = dict(e.headers)
        try:
            json_data = json.loads(body)
        except Exception:
            json_data = body
        return e.code, json_data, resp_headers

def multipart_post(url, fields, files, headers=None):
    if headers is None:
        headers = {}
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    
    body = io.BytesIO()
    for key, val in fields.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        body.write(f"{val}\r\n".encode())
    
    for key, (filename, content, content_type) in files.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode())
        body.write(f"Content-Type: {content_type}\r\n\r\n".encode())
        if isinstance(content, str):
            body.write(content.encode())
        else:
            body.write(content)
        body.write(b"\r\n")
    
    body.write(f"--{boundary}--\r\n".encode())
    data = body.getvalue()
    
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            res_body = resp.read().decode("utf-8")
            return resp.status, json.loads(res_body), dict(resp.headers)
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            data = json.loads(res_body)
        except Exception:
            data = res_body
        return e.code, data, dict(e.headers)

def run_tests():
    print("=================================================================")
    print("RUNNING TREEGUARD COMPLETE SECURITY HARDENING TEST SUITE")
    print("=================================================================")

    # 1. Health check & Security Headers
    print("\n[SECTION 1] Testing HTTP Security Headers...")
    status, data, resp_headers = make_request(f"{BASE_URL}/health")
    assert status == 200, f"Expected 200, got {status}"
    assert "x-content-type-options" in resp_headers, "Missing X-Content-Type-Options header"
    assert resp_headers["x-content-type-options"] == "nosniff"
    assert "x-frame-options" in resp_headers, "Missing X-Frame-Options header"
    assert resp_headers["x-frame-options"] == "DENY"
    assert "referrer-policy" in resp_headers, "Missing Referrer-Policy header"
    print("  [PASS] Security headers verified (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).")

    # 2. Authentication & User Registration
    print("\n[SECTION 2] Testing Authentication & Credential Security...")
    suffix = uuid.uuid4().hex[:6]
    citizen_email = f"citizen_{suffix}@treeguard.org"
    inspector_email = f"inspector_{suffix}@treeguard.org"
    admin_email = f"admin_{suffix}@treeguard.org"
    password = "SecurePassword2026!"

    # Test short password rejection
    st, d, _ = make_request(f"{BASE_URL}/auth/register", "POST", {
        "full_name": "Test User", "email": f"short_{suffix}@example.com", "password": "123", "role": "citizen"
    })
    assert st == 422, f"Expected 422 for short password, got {st}"
    print("  [PASS] Short password (<8 chars) correctly rejected with 422.")

    # Register Citizen
    st, cit_user, _ = make_request(f"{BASE_URL}/auth/register", "POST", {
        "full_name": "Alice Citizen", "email": citizen_email, "password": password, "role": "citizen"
    })
    assert st == 201
    assert "password_hash" not in cit_user, "CRITICAL: password_hash exposed in UserResponse!"
    print("  [PASS] Citizen registered; password_hash verified NOT exposed in response.")

    # Register Inspector
    st, insp_user, _ = make_request(f"{BASE_URL}/auth/register", "POST", {
        "full_name": "Bob Inspector", "email": inspector_email, "password": password, "role": "inspector"
    })
    assert st == 201

    # Register Admin
    st, adm_user, _ = make_request(f"{BASE_URL}/auth/register", "POST", {
        "full_name": "Carol Admin", "email": admin_email, "password": password, "role": "admin"
    })
    assert st == 201

    # Login tests
    st, d, _ = make_request(f"{BASE_URL}/auth/login", "POST", {"email": citizen_email, "password": "WrongPassword!"})
    assert st == 401, f"Expected 401 for wrong password, got {st}"
    print("  [PASS] Invalid login credentials rejected with 401.")

    # Valid Logins
    _, cit_auth, _ = make_request(f"{BASE_URL}/auth/login", "POST", {"email": citizen_email, "password": password})
    cit_token = cit_auth["access_token"]

    _, insp_auth, _ = make_request(f"{BASE_URL}/auth/login", "POST", {"email": inspector_email, "password": password})
    insp_token = insp_auth["access_token"]

    _, adm_auth, _ = make_request(f"{BASE_URL}/auth/login", "POST", {"email": admin_email, "password": password})
    adm_token = adm_auth["access_token"]

    # Test invalid / tampered token
    st, _, _ = make_request(f"{BASE_URL}/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
    assert st == 401
    print("  [PASS] Malformed/tampered JWT rejected with 401.")

    # Test unauthenticated access to protected route
    st, _, _ = make_request(f"{BASE_URL}/users/me")
    assert st == 401
    print("  [PASS] Unauthenticated access to protected routes rejected with 401.")

    # 3. RBAC & Server-Side Role Enforcement
    print("\n[SECTION 3] Testing Server-Side Role Authorization (RBAC)...")
    # Citizen accessing Admin dashboard
    st, d, _ = make_request(f"{BASE_URL}/admin/dashboard", headers={"Authorization": f"Bearer {cit_token}"})
    assert st == 403, f"Expected 403 for citizen accessing admin dashboard, got {st}"
    print("  [PASS] Citizen role blocked from /api/admin/dashboard (403 Forbidden).")

    # Citizen accessing Admin analytics
    st, d, _ = make_request(f"{BASE_URL}/analytics", headers={"Authorization": f"Bearer {cit_token}"})
    assert st == 403, f"Expected 403 for citizen accessing analytics, got {st}"
    print("  [PASS] Citizen role blocked from /api/analytics (403 Forbidden).")

    # Citizen accessing Inspector queue
    st, d, _ = make_request(f"{BASE_URL}/inspector/assignments", headers={"Authorization": f"Bearer {cit_token}"})
    assert st == 403, f"Expected 403 for citizen accessing inspector queue, got {st}"
    print("  [PASS] Citizen role blocked from /api/inspector/assignments (403 Forbidden).")

    # Citizen creating Recovery Plan (Hardened!)
    st, d, _ = make_request(f"{BASE_URL}/recovery-plans", "POST", {
        "tree_id": "TRE-0481", "priority": "High", "severity": "Moderate", "actions": []
    }, headers={"Authorization": f"Bearer {cit_token}"})
    assert st == 403, f"Expected 403 for citizen creating recovery plan, got {st}"
    print("  [PASS] Citizen role blocked from creating recovery plans (403 Forbidden).")

    # Inspector accessing Admin dashboard
    st, d, _ = make_request(f"{BASE_URL}/admin/dashboard", headers={"Authorization": f"Bearer {insp_token}"})
    assert st == 403, f"Expected 403 for inspector accessing admin dashboard, got {st}"
    print("  [PASS] Inspector role blocked from /api/admin/dashboard (403 Forbidden).")

    # Admin accessing Admin dashboard (Permitted)
    st, adm_dash, _ = make_request(f"{BASE_URL}/admin/dashboard", headers={"Authorization": f"Bearer {adm_token}"})
    assert st == 200, f"Expected 200 for admin, got {st}"
    print("  [PASS] Admin role permitted to access /api/admin/dashboard.")

    # 4. Object Ownership & IDOR Protection
    print("\n[SECTION 4] Testing Object Ownership & IDOR Protection...")
    # Register User B (Citizen)
    user_b_email = f"user_b_{suffix}@treeguard.org"
    st, user_b, _ = make_request(f"{BASE_URL}/auth/register", "POST", {
        "full_name": "User B", "email": user_b_email, "password": password, "role": "citizen"
    })
    _, b_auth, _ = make_request(f"{BASE_URL}/auth/login", "POST", {"email": user_b_email, "password": password})
    b_token = b_auth["access_token"]

    # User A (Citizen) submits a report
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    st, rep_a, _ = multipart_post(
        f"{BASE_URL}/reports",
        {"issue_type": "branch", "location_name": "Oak Ave & 2nd St", "latitude": "37.7749", "longitude": "-122.4194"},
        {"image": ("report.png", valid_png, "image/png")},
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert st == 201
    rep_a_id = rep_a["id"]

    # User B tries to read User A's private report via GET /api/reports/{id}
    st, idor_data, _ = make_request(f"{BASE_URL}/reports/{rep_a_id}", headers={"Authorization": f"Bearer {b_token}"})
    assert st == 403, f"Expected 403 for IDOR attempt, got {st}"
    print(f"  [PASS] IDOR Protection: User B forbidden from accessing User A's report {rep_a_id} (403).")

    # User A can read their own report
    st, own_rep, _ = make_request(f"{BASE_URL}/reports/{rep_a_id}", headers={"Authorization": f"Bearer {cit_token}"})
    assert st == 200
    print("  [PASS] Resource owner permitted to access own report.")

    # 5. Input Validation & Coordinate Bounds
    print("\n[SECTION 5] Testing Coordinate & Input Validation...")
    # Invalid latitude > 90
    st, d, _ = multipart_post(
        f"{BASE_URL}/reports",
        {"issue_type": "branch", "location_name": "North Pole", "latitude": "125.0", "longitude": "-122.4194"},
        {"image": ("report.png", valid_png, "image/png")},
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert st == 422, f"Expected 422 for invalid latitude, got {st}"
    print("  [PASS] Latitude > 90 correctly rejected with 422 Unprocessable Content.")

    # Invalid longitude > 180
    st, d, _ = multipart_post(
        f"{BASE_URL}/reports",
        {"issue_type": "branch", "location_name": "Far East", "latitude": "37.7749", "longitude": "250.0"},
        {"image": ("report.png", valid_png, "image/png")},
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert st == 422, f"Expected 422 for invalid longitude, got {st}"
    print("  [PASS] Longitude > 180 correctly rejected with 422 Unprocessable Content.")

    # 6. File Upload Safety & Path Traversal Prevention
    print("\n[SECTION 6] Testing File Upload Protections...")
    # Disallowed file type (.exe)
    st, d, _ = multipart_post(
        f"{BASE_URL}/reports",
        {"issue_type": "branch", "location_name": "Test Location"},
        {"image": ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/x-msdownload")},
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert st == 400, f"Expected 400 for .exe file, got {st}"
    print("  [PASS] Executable file (.exe) rejected with 400 Bad Request.")

    # Path traversal attempt in filename
    st, tra_resp, _ = multipart_post(
        f"{BASE_URL}/reports",
        {"issue_type": "branch", "location_name": "Test Location"},
        {"image": ("../../../../etc/passwd.png", valid_png, "image/png")},
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert st == 201
    assert not tra_resp["image_url"].startswith(".."), "Filename path escaped!"
    assert tra_resp["image_url"].startswith("/uploads/reports/"), "File not saved in confined directory!"
    print("  [PASS] Path traversal attempt in filename safely neutralized to random UUID within /uploads/reports/.")

    # Corrupted image content (fake extension)
    st, d, _ = multipart_post(
        f"{BASE_URL}/reports",
        {"issue_type": "branch", "location_name": "Test Location"},
        {"image": ("fake.png", b"This is plain text not a real png", "image/png")},
        headers={"Authorization": f"Bearer {cit_token}"}
    )
    assert st == 400, f"Expected 400 for corrupted image, got {st}"
    print("  [PASS] Corrupted image (failed magic bytes) rejected with 400 Bad Request.")

    # 7. Account Enumeration Protection
    print("\n[SECTION 7] Testing Account Enumeration Protections...")
    st, forgot_res, _ = make_request(f"{BASE_URL}/auth/forgot-password", "POST", {"email": "nonexistent_random_user_999@treeguard.org"})
    assert st == 200
    assert "If an account exists" in forgot_res["message"], "Account enumeration leak!"
    print("  [PASS] Forgot-password endpoint returns generic message preventing email enumeration.")

    print("\n=================================================================")
    print("ALL SECURITY HARDENING TESTS PASSED WITH 100% SUCCESS!")
    print("=================================================================")

if __name__ == "__main__":
    run_tests()
