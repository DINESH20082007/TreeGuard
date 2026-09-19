import urllib.request
import urllib.error
import json
import uuid
import os
import io

BASE_API = "http://127.0.0.1:8000/api"

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

print("=================================================================")
print("RUNNING TREEGUARD EMERGENCY DETECTION REAL BACKEND & AI TEST SUITE")
print("=================================================================")

# Step 1: Health Check
print("\n[STEP 1] Testing Backend Health Check...")
code, health_data = req(f"{BASE_API}/health")
assert code == 200, f"Backend health check failed: {health_data}"
print(f"  [PASS] Backend health check OK (status: {health_data.get('status')})")

# Step 2: Register & Authenticate User 1
print("\n[STEP 2] Authenticating User 1 (Citizen)...")
user1_email = f"emg_user1_{uuid.uuid4().hex[:6]}@treeguard.org"
password = "Password123!"
code, u1_reg = req(f"{BASE_API}/auth/register", {
    "full_name": "Emergency Reporter One",
    "email": user1_email,
    "password": password,
    "role": "citizen"
}, method="POST")
assert code == 201, f"Registration failed: {u1_reg}"

code, u1_login = req(f"{BASE_API}/auth/login", {
    "email": user1_email,
    "password": password
}, method="POST")
assert code == 200, f"Login failed: {u1_login}"
token1 = u1_login["access_token"]
user1_id = u1_login["user"]["id"]
print(f"  [PASS] User 1 authenticated: {user1_email} (ID: {user1_id})")

# Authenticate User 2 (for authorization / isolation verification)
print("\n[STEP 3] Authenticating User 2 (Citizen for security check)...")
user2_email = f"emg_user2_{uuid.uuid4().hex[:6]}@treeguard.org"
code, u2_reg = req(f"{BASE_API}/auth/register", {
    "full_name": "Emergency Reporter Two",
    "email": user2_email,
    "password": password,
    "role": "citizen"
}, method="POST")
assert code == 201, f"Registration failed: {u2_reg}"

code, u2_login = req(f"{BASE_API}/auth/login", {
    "email": user2_email,
    "password": password
}, method="POST")
assert code == 200, f"Login failed: {u2_login}"
token2 = u2_login["access_token"]
user2_id = u2_login["user"]["id"]
print(f"  [PASS] User 2 authenticated: {user2_email} (ID: {user2_id})")

# Step 4: Test Unauthenticated Request Rejection (401)
print("\n[STEP 4] Testing Unauthenticated Emergency Request Rejection (401)...")
jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 1024
files = {"image": ("emergency_tree.jpg", jpeg_bytes, "image/jpeg")}
data, ctype = encode_multipart_formdata({}, files)
code, unauth_res = req(f"{BASE_API}/emergency/analyze", data=data, token=None, method="POST", content_type=ctype)
assert code == 401, f"Expected 401 unauthenticated, got {code}: {unauth_res}"
print("  [PASS] Unauthenticated request correctly rejected with 401.")

# Step 5: Test Unsupported File Extension Validation (400)
print("\n[STEP 5] Testing Unsupported File Extension Rejection (400)...")
bad_files = {"image": ("script.py", b"print('hello world')", "text/x-python")}
bad_data, bad_ctype = encode_multipart_formdata({}, bad_files)
code, bad_res = req(f"{BASE_API}/emergency/analyze", data=bad_data, token=token1, method="POST", content_type=bad_ctype)
assert code == 400, f"Expected 400, got {code}: {bad_res}"
print(f"  [PASS] Unsupported file type rejected: {bad_res.get('detail')}")

# Step 6: Test Corrupted Magic Bytes Rejection (400)
print("\n[STEP 6] Testing Corrupted Magic Bytes Rejection (400)...")
corrupt_files = {"image": ("fake.jpg", b"THIS_IS_CORRUPTED_TEXT_DATA_NOT_JPEG", "image/jpeg")}
corrupt_data, corrupt_ctype = encode_multipart_formdata({}, corrupt_files)
code, corrupt_res = req(f"{BASE_API}/emergency/analyze", data=corrupt_data, token=token1, method="POST", content_type=corrupt_ctype)
assert code == 400, f"Expected 400 for corrupt magic bytes, got {code}: {corrupt_res}"
print("  [PASS] Corrupted magic bytes rejected with 400 Bad Request.")

# Step 7: Test Oversized File Rejection (413 / 400)
print("\n[STEP 7] Testing Oversized File (>10MB) Rejection...")
oversized_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * (11 * 1024 * 1024)
oversized_files = {"image": ("huge_tree.jpg", oversized_bytes, "image/jpeg")}
oversized_data, oversized_ctype = encode_multipart_formdata({}, oversized_files)
code, oversized_res = req(f"{BASE_API}/emergency/analyze", data=oversized_data, token=token1, method="POST", content_type=oversized_ctype)
assert code in (400, 413), f"Expected 400 or 413 for oversized file, got {code}: {oversized_res}"
print(f"  [PASS] Oversized file rejected: {oversized_res.get('detail')}")

# Step 8: Test Valid Emergency Submission & AI Model Availability Honesty Check
print("\n[STEP 8] Testing Valid Emergency Photo Submission & AI Honesty Reporting...")
fields = {
    "location_name": "Pine St & 4th Ave, Downtown",
    "latitude": "37.7833",
    "longitude": "-122.4167",
}
valid_files = {"image": ("fallen_pine_hazard.jpg", jpeg_bytes, "image/jpeg")}
valid_data, valid_ctype = encode_multipart_formdata(fields, valid_files)

code, res = req(f"{BASE_API}/emergency/analyze", data=valid_data, token=token1, method="POST", content_type=valid_ctype)
assert code == 200, f"Expected 200 for emergency analyze, got {code}: {res}"

analysis_id = res["id"]
assert analysis_id.startswith("EMG-2026-"), f"Expected EMG-2026- prefix, got {analysis_id}"
assert res["user_id"] == user1_id
assert res["analysis_status"] == "unavailable", f"Expected 'unavailable' status when no AI model configured, got {res['analysis_status']}"
assert res["is_ai_available"] is False, "Expected is_ai_available to be False"
assert res["emergency_detected"] is False, "Expected emergency_detected to be False"
assert res["image_url"].startswith("/uploads/emergency/"), f"Invalid image_url: {res['image_url']}"
assert "Manual review recommended" in res["recommended_action"] or "manual" in res["recommended_action"].lower()
print(f"  [PASS] Valid analysis record created: ID={analysis_id}")
print(f"         Status: {res['analysis_status']} | AI Available: {res['is_ai_available']} | Emergency Detected: {res['emergency_detected']}")
print(f"         Action: {res['recommended_action'][:55]}...")

# Step 9: Test Fetching User's Analysis History (GET /api/emergency/my)
print("\n[STEP 9] Testing User Emergency History (GET /api/emergency/my)...")
code, my_history = req(f"{BASE_API}/emergency/my", token=token1)
assert code == 200, f"Expected 200 for emergency history, got {code}: {my_history}"
assert len(my_history) >= 1, "Expected at least 1 analysis record"
assert any(a["id"] == analysis_id for a in my_history), f"Analysis ID {analysis_id} not in history"
print(f"  [PASS] Retrieved {len(my_history)} analysis record(s) in user history.")

# Step 10: Test Fetching Single Analysis by ID (GET /api/emergency/{id})
print("\n[STEP 10] Testing Single Emergency Analysis Retrieval (GET /api/emergency/{id})...")
code, single_analysis = req(f"{BASE_API}/emergency/{analysis_id}", token=token1)
assert code == 200, f"Expected 200, got {code}: {single_analysis}"
assert single_analysis["id"] == analysis_id
assert single_analysis["user_id"] == user1_id
assert single_analysis["location_name"] == "Pine St & 4th Ave, Downtown"
print(f"  [PASS] Retrieved single analysis record: {single_analysis['id']}")

# Step 11: Test Cross-User Access Prevention (Security Isolation)
print("\n[STEP 11] Testing Cross-User Security Isolation (User 2 reading User 1's record)...")
code, forbidden_res = req(f"{BASE_API}/emergency/{analysis_id}", token=token2)
assert code == 403, f"Expected 403 Forbidden for cross-user access, got {code}: {forbidden_res}"
print(f"  [PASS] Cross-user access prevented with 403: {forbidden_res.get('detail')}")

# Step 12: Test 404 for Non-Existent Analysis ID
print("\n[STEP 12] Testing Non-Existent Analysis ID (404)...")
code, notfound_res = req(f"{BASE_API}/emergency/EMG-2026-NONEXISTENT", token=token1)
assert code == 404, f"Expected 404 for non-existent analysis, got {code}: {notfound_res}"
print(f"  [PASS] Non-existent analysis ID correctly returned 404.")

# Step 13: Test Static Serving of Uploaded Emergency Image
print("\n[STEP 13] Testing Static Serving of Uploaded Emergency Image...")
img_url = f"http://127.0.0.1:8000{res['image_url']}"
with urllib.request.urlopen(img_url) as img_resp:
    assert img_resp.status == 200
    saved_bytes = img_resp.read()
    assert len(saved_bytes) == len(jpeg_bytes)
    print(f"  [PASS] Emergency image served directly from {img_url} ({len(saved_bytes)} bytes)")

print("\n=================================================================")
print(" ALL TREEGUARD EMERGENCY DETECTION TESTS PASSED (100%)!")
print("=================================================================")
