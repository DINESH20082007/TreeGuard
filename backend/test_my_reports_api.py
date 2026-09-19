import urllib.request
import urllib.parse
import json
import time
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(path, method="GET", data=None, headers=None, is_json=False):
    url = f"{BASE_URL}{path}"
    headers = headers or {}
    
    body = None
    if data is not None:
        if is_json:
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(data, dict):
            body = urllib.parse.urlencode(data).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        elif isinstance(data, bytes):
            body = data

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            try:
                return response.status, json.loads(res_body)
            except Exception:
                return response.status, res_body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body

def encode_multipart_form(fields, files):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    lines = []
    
    for name, value in fields.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{name}"'.encode("utf-8"))
        lines.append(b"")
        lines.append(str(value).encode("utf-8"))
        
    for name, (filename, content, content_type) in files.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode("utf-8"))
        lines.append(f"Content-Type: {content_type}".encode("utf-8"))
        lines.append(b"")
        lines.append(content)
        
    lines.append(f"--{boundary}--".encode("utf-8"))
    lines.append(b"")
    
    body = b"\r\n".join(lines)
    content_type = f"multipart/form-data; boundary={boundary}"
    return body, content_type

def run_tests():
    print("=== Testing 'My Reports — Real Backend Data' API ===")
    
    # 1. Test unauthenticated request
    print("\n1. Testing unauthenticated GET /reports/my...")
    status, res = make_request("/reports/my", method="GET")
    print(f"Unauthenticated status: {status}")
    assert status == 401, f"Expected 401, got {status}"
    print("  [OK] 401 Unauthorized returned for unauthenticated request.")

    # 2. Register/Login User A
    ts = int(time.time() * 1000)
    email_a = f"alice_{ts}@example.com"
    password = "Password123!"
    print(f"\n2. Registering User A ({email_a})...")
    status, reg_res_a = make_request("/auth/register", method="POST", data={
        "email": email_a,
        "full_name": "Alice Reporter",
        "password": password,
        "role": "citizen"
    }, is_json=True)
    
    status, login_res_a = make_request("/auth/login", method="POST", data={
        "email": email_a,
        "password": password
    }, is_json=True)
    assert status == 200, f"Login failed: {login_res_a}"
    token_a = login_res_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print("  [OK] User A authenticated successfully.")

    # 3. Test GET /reports/my for User A before submitting reports
    print("\n3. Testing GET /reports/my for User A (zero reports)...")
    status, reports_empty = make_request("/reports/my", method="GET", headers=headers_a)
    print(f"Status: {status}, Payload: {reports_empty}")
    assert status == 200, f"Expected 200, got {status}"
    assert reports_empty == [], f"Expected empty list [], got {reports_empty}"
    print("  [OK] Empty reports list returned for user with zero reports.")

    # 4. User A submits a real report
    print("\n4. Submitting a new tree report for User A...")
    png_data = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00'
        b'\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    fields_a = {
        "issue_type": "branch",
        "location_name": "Pine Grove Trail, Sector 4",
        "description": "Large branch snapped and hanging over trail pathway",
        "latitude": "37.7749",
        "longitude": "-122.4194",
        "additional_notes": "Hazardous to trail joggers"
    }
    files_a = {
        "image": ("fallen_branch.png", png_data, "image/png")
    }
    body_a, ct_a = encode_multipart_form(fields_a, files_a)
    headers_a_upload = {"Authorization": f"Bearer {token_a}", "Content-Type": ct_a}
    
    status, report_a_res = make_request("/reports", method="POST", data=body_a, headers=headers_a_upload)
    assert status == 201, f"Report submission failed: {report_a_res}"
    report_a_id = report_a_res["id"]
    print(f"  [OK] User A created report: ID={report_a_id}, Status={report_a_res['status']}")

    # 5. Test GET /reports/my for User A after submission
    print("\n5. Testing GET /reports/my for User A after submission...")
    status, reports_a = make_request("/reports/my", method="GET", headers=headers_a)
    assert status == 200
    assert len(reports_a) == 1, f"Expected 1 report, got {len(reports_a)}"
    assert reports_a[0]["id"] == report_a_id
    assert reports_a[0]["issue_type"] == "branch"
    assert reports_a[0]["location_name"] == "Pine Grove Trail, Sector 4"
    assert reports_a[0]["status"] == "pending"
    print(f"  [OK] GET /reports/my correctly returns User A's report: {reports_a[0]['id']}")

    # 6. Register/Login User B
    email_b = f"bob_{ts}@example.com"
    print(f"\n6. Registering User B ({email_b})...")
    status, reg_res_b = make_request("/auth/register", method="POST", data={
        "email": email_b,
        "full_name": "Bob Citizen",
        "password": password,
        "role": "citizen"
    }, is_json=True)
    status, login_res_b = make_request("/auth/login", method="POST", data={
        "email": email_b,
        "password": password
    }, is_json=True)
    assert status == 200
    token_b = login_res_b["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print("  [OK] User B authenticated successfully.")

    # 7. Verify User B CANNOT see User A's reports in GET /reports/my
    print("\n7. Verifying User Isolation (User B requests /reports/my)...")
    status, reports_b = make_request("/reports/my", method="GET", headers=headers_b)
    assert status == 200
    assert len(reports_b) == 0, f"Security violation: User B saw reports: {reports_b}"
    print("  [OK] Security verified: User B sees 0 reports (User A's reports are private).")

    # 8. User B submits their own report
    print("\n8. User B submits their own report...")
    fields_b = {
        "issue_type": "trunk",
        "location_name": "Maple Blvd & 5th Ave",
        "description": "Deep trunk fungal rot and cavity"
    }
    files_b = {
        "image": ("trunk_damage.png", png_data, "image/png")
    }
    body_b, ct_b = encode_multipart_form(fields_b, files_b)
    headers_b_upload = {"Authorization": f"Bearer {token_b}", "Content-Type": ct_b}
    status, report_b_res = make_request("/reports", method="POST", data=body_b, headers=headers_b_upload)
    assert status == 201
    report_b_id = report_b_res["id"]
    print(f"  [OK] User B created report: ID={report_b_id}")

    # 9. Verify mutual isolation
    print("\n9. Verifying mutual isolation...")
    status, res_a_final = make_request("/reports/my", method="GET", headers=headers_a)
    status, res_b_final = make_request("/reports/my", method="GET", headers=headers_b)
    
    ids_a = [r["id"] for r in res_a_final]
    ids_b = [r["id"] for r in res_b_final]

    print(f"  User A reports: {ids_a}")
    print(f"  User B reports: {ids_b}")

    assert report_a_id in ids_a and report_b_id not in ids_a, "User A report list contaminated"
    assert report_b_id in ids_b and report_a_id not in ids_b, "User B report list contaminated"
    print("  [OK] Perfect user data isolation confirmed!")

    print("\n=== All My Reports Backend Tests Passed Successfully! ===")

if __name__ == "__main__":
    run_tests()
