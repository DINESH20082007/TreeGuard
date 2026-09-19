import urllib.request
import json
import uuid
import os
import io

BASE_API = "http://127.0.0.1:8000/api"

# Helper to construct multipart/form-data requests in pure python
def encode_multipart_formdata(fields, files):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    buffer = io.BytesIO()
    
    for name, value in fields.items():
        if value is not None:
            buffer.write(f"--{boundary}\r\n".encode("utf-8"))
            buffer.write(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
            buffer.write(f"{value}\r\n".encode("utf-8"))
            
    for name, (filename, filecontent, content_type) in files.items():
        buffer.write(f"--{boundary}\r\n".encode("utf-8"))
        buffer.write(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
        buffer.write(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        buffer.write(filecontent)
        buffer.write(b"\r\n")
        
    buffer.write(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return buffer.getvalue(), content_type

def req(url, data=None, token=None, method="GET", content_type="application/json"):
    headers = {}
    if content_type:
        headers["Content-Type"] = content_type
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = None
    if data is not None:
        if isinstance(data, (bytes, bytearray)):
            body = data
        else:
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
            
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            return response.getcode(), json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except:
            return e.code, {"error": str(e)}

print("==================================================")
print("RUNNING REPORT A TREE API VERIFICATION SUITE")
print("==================================================")

# Step 1: Register test citizen user
citizen_email = f"citizen_{uuid.uuid4().hex[:6]}@treeguard.org"
password = "Password123!"
code, user_data = req(f"{BASE_API}/auth/register", {
    "full_name": "Sarah Miller",
    "email": citizen_email,
    "password": password,
    "role": "citizen"
}, method="POST")
assert code == 201, f"Registration failed: {user_data}"

# Login
code, login_data = req(f"{BASE_API}/auth/login", {
    "email": citizen_email,
    "password": password
}, method="POST")
assert code == 200, f"Login failed: {login_data}"
token = login_data["access_token"]
user_id = login_data["user"]["id"]
print(f"[PASS] Citizen registered & authenticated: Sarah Miller (ID: {user_id})")

# Step 2: Valid Report Submission with JPEG Image
# Valid JPEG starts with \xff\xd8\xff
jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 100
fields = {
    "issue_type": "branch",
    "location_name": "Oak Ave & 5th St, Downtown",
    "description": "Large branch cracked after heavy winds. Poses hazard to sidewalk.",
    "latitude": "37.7792",
    "longitude": "-122.4185",
    "observed_at": "Sep 19, 2026 at 9:30 AM",
    "additional_notes": "Near bench 4, cross street 5th."
}
files = {
    "image": ("broken_branch.jpg", jpeg_bytes, "image/jpeg")
}
data, ctype = encode_multipart_formdata(fields, files)

code, res = req(f"{BASE_API}/reports", data=data, token=token, method="POST", content_type=ctype)
assert code == 201, f"Expected 201, got {code}: {res}"
report_id = res["id"]
assert report_id.startswith("TRG-2026-"), f"Expected ID prefix TRG-2026-, got {report_id}"
assert res["status"] == "pending"
assert res["image_url"].startswith("/uploads/reports/")
print(f"[PASS] Valid report created with unique ID: {report_id}, image: {res['image_url']}")

# Step 3: Fetch Created Report by ID
code, report_detail = req(f"{BASE_API}/reports/{report_id}", token=token)
assert code == 200
assert report_detail["id"] == report_id
assert report_detail["reporter_id"] == user_id
assert report_detail["issue_type"] == "branch"
assert report_detail["location_name"] == "Oak Ave & 5th St, Downtown"
assert report_detail["priority"] == "Medium"
assert report_detail["latitude"] == 37.7792
assert report_detail["longitude"] == -122.4185
print(f"[PASS] Report detail fetched: {report_detail['id']} ({report_detail['priority']} priority, {report_detail['status']} status)")

# Step 4: Verify Report appears in user's report list
code, my_reports = req(f"{BASE_API}/reports", token=token)
assert code == 200
assert any(r["id"] == report_id for r in my_reports)
print(f"[PASS] GET /api/reports contains new report {report_id} (total {len(my_reports)} user reports)")

# Step 5: Test Unsupported File Extension Validation
bad_files = {
    "image": ("malicious.exe", b"MZ\x90\x00", "application/octet-stream")
}
bad_data, bad_ctype = encode_multipart_formdata(fields, bad_files)
code, bad_res = req(f"{BASE_API}/reports", data=bad_data, token=token, method="POST", content_type=bad_ctype)
assert code == 400, f"Expected 400, got {code}: {bad_res}"
print(f"[PASS] Unsupported file type rejected: {bad_res.get('detail')}")

# Step 6: Test Unauthorized Submission Rejection (No Token)
code, unauth_res = req(f"{BASE_API}/reports", data=data, token=None, method="POST", content_type=ctype)
assert code == 401, f"Expected 401, got {code}: {unauth_res}"
print(f"[PASS] Unauthenticated submission rejected with 401 Unauthorized")

# Step 7: Test Missing Location Validation
no_loc_fields = dict(fields)
no_loc_fields["location_name"] = ""
no_loc_data, no_loc_ctype = encode_multipart_formdata(no_loc_fields, files)
code, no_loc_res = req(f"{BASE_API}/reports", data=no_loc_data, token=token, method="POST", content_type=no_loc_ctype)
assert code in [400, 422], f"Expected 400/422, got {code}: {no_loc_res}"
print(f"[PASS] Empty location rejected with validation error: {no_loc_res.get('detail')}")

# Step 8: Test Static Upload Serving
image_relative_url = res["image_url"]
image_full_url = f"http://127.0.0.1:8000{image_relative_url}"
try:
    with urllib.request.urlopen(image_full_url) as img_resp:
        assert img_resp.status == 200
        saved_bytes = img_resp.read()
        assert len(saved_bytes) == len(jpeg_bytes)
        print(f"[PASS] Uploaded image successfully served from storage at {image_full_url}")
except Exception as e:
    raise AssertionError(f"Failed to fetch uploaded image: {e}")

print("\n==================================================")
print("ALL REPORT A TREE BACKEND TESTS PASSED 100%!")
print("==================================================")
