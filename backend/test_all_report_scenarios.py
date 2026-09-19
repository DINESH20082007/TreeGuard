import urllib.request
import json
import uuid
import os
import io

BASE_API = "http://127.0.0.1:8000/api"
BASE_FRONTEND = "http://localhost:8443"

def encode_multipart_formdata(fields, files):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    buffer = io.BytesIO()
    
    for name, value in fields.items():
        if value is not None:
            buffer.write(f"--{boundary}\r\n".encode("utf-8"))
            buffer.write(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
            buffer.write(str(value).encode("utf-8"))
            buffer.write(b"\r\n")
            
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
print("RUNNING COMPLETE VERIFICATION SUITE FOR REPORT A TREE FEATURE")
print("=================================================================")

# Setup test user 1 (Citizen)
email1 = f"citizen_qa_{uuid.uuid4().hex[:6]}@treeguard.org"
code, _ = req(f"{BASE_API}/auth/register", {"full_name": "Elena Rostova", "email": email1, "password": "Password123!", "role": "citizen"}, method="POST")
assert code == 201
code, login1 = req(f"{BASE_API}/auth/login", {"email": email1, "password": "Password123!"}, method="POST")
token1 = login1["access_token"]
user_id1 = login1["user"]["id"]
print(f"[AUTH] Authenticated User 1: Elena Rostova (ID: {user_id1})")

# Setup test user 2 (Inspector)
email2 = f"inspector_qa_{uuid.uuid4().hex[:6]}@treeguard.org"
code, _ = req(f"{BASE_API}/auth/register", {"full_name": "Marcus Field", "email": email2, "password": "Password123!", "role": "inspector"}, method="POST")
assert code == 201
code, login2 = req(f"{BASE_API}/auth/login", {"email": email2, "password": "Password123!"}, method="POST")
token2 = login2["access_token"]
user_id2 = login2["user"]["id"]
print(f"[AUTH] Authenticated User 2: Marcus Field (ID: {user_id2})")

# TEST 1: Logged-in citizen submits a valid report (Image uploads, report saved, real report ID returned)
print("\n[TEST 1] Citizen submits valid report with PNG photo...")
png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00\x1f\xf3\xffa" + b"\x00" * 80
fields1 = {
    "issue_type": "fallen",
    "location_name": "Central Park East, Main Pathway",
    "description": "Old oak tree completely uprooted after windstorm. Blocking pedestrian pathway.",
    "latitude": "37.7815",
    "longitude": "-122.4112",
    "observed_at": "Sep 19, 2026 at 10:00 AM",
    "additional_notes": "Immediate safety risk."
}
files1 = {"image": ("fallen_tree.png", png_bytes, "image/png")}
payload1, ctype1 = encode_multipart_formdata(fields1, files1)

code1, res1 = req(f"{BASE_API}/reports", data=payload1, token=token1, method="POST", content_type=ctype1)
assert code1 == 201, f"Expected 201, got {code1}: {res1}"
report_id1 = res1["id"]
assert report_id1.startswith("TRG-2026-"), f"Invalid ID pattern: {report_id1}"
assert res1["status"] == "pending"
assert res1["image_url"].startswith("/uploads/reports/")
print(f"[PASS] Report 1 created: ID {report_id1}, status: {res1['status']}, image: {res1['image_url']}")

# TEST 2: Submit a second distinct report to verify unique report ID generation (No hardcoded ID)
print("\n[TEST 2] Citizen submits a second report to verify unique ID generation...")
jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 80
fields2 = {
    "issue_type": "health",
    "location_name": "Market St & 7th Ave",
    "description": "Sycamore crown exhibits severe premature browning and leaf drop.",
    "latitude": "37.7780",
    "longitude": "-122.4225",
}
files2 = {"image": ("canopy_stress.jpg", jpeg_bytes, "image/jpeg")}
payload2, ctype2 = encode_multipart_formdata(fields2, files2)

code2, res2 = req(f"{BASE_API}/reports", data=payload2, token=token1, method="POST", content_type=ctype2)
assert code2 == 201
report_id2 = res2["id"]
assert report_id2 != report_id1, f"Report IDs must be unique! Got duplicate: {report_id1} == {report_id2}"
print(f"[PASS] Report 2 created with distinct unique ID: {report_id2} != {report_id1}")

# TEST 3: Submit without an image when image is required -> Validation error
print("\n[TEST 3] Validation error on missing image...")
no_image_payload, no_image_ctype = encode_multipart_formdata(fields1, {})
code3, res3 = req(f"{BASE_API}/reports", data=no_image_payload, token=token1, method="POST", content_type=no_image_ctype)
assert code3 in [400, 422], f"Expected 400/422, got {code3}"
print(f"[PASS] Correctly rejected missing image: {res3.get('detail')}")

# TEST 4: Upload unsupported file type -> Clear validation error
print("\n[TEST 4] Validation error on unsupported file type (.pdf)...")
pdf_files = {"image": ("document.pdf", b"%PDF-1.5 test document content", "application/pdf")}
bad_ext_payload, bad_ext_ctype = encode_multipart_formdata(fields1, pdf_files)
code4, res4 = req(f"{BASE_API}/reports", data=bad_ext_payload, token=token1, method="POST", content_type=bad_ext_ctype)
assert code4 == 400, f"Expected 400, got {code4}"
print(f"[PASS] Correctly rejected unsupported file type: {res4.get('detail')}")

# TEST 5: Upload oversized file (> 10MB) -> Clear validation error
print("\n[TEST 5] Validation error on oversized file (>10MB)...")
huge_bytes = b"\xff\xd8\xff" + b"\x00" * (11 * 1024 * 1024)
huge_files = {"image": ("huge_photo.jpg", huge_bytes, "image/jpeg")}
huge_payload, huge_ctype = encode_multipart_formdata(fields1, huge_files)
code5, res5 = req(f"{BASE_API}/reports", data=huge_payload, token=token1, method="POST", content_type=huge_ctype)
assert code5 == 400, f"Expected 400, got {code5}"
print(f"[PASS] Correctly rejected oversized file (>10MB): {res5.get('detail')}")

# TEST 6: Verify report details in database
print("\n[TEST 6] Fetching created report from database...")
code6, detail1 = req(f"{BASE_API}/reports/{report_id1}", token=token1)
assert code6 == 200
assert detail1["id"] == report_id1
assert detail1["reporter_id"] == user_id1
assert detail1["issue_type"] == "fallen"
assert detail1["priority"] == "High"
assert detail1["latitude"] == 37.7815
assert detail1["longitude"] == -122.4112
assert detail1["location_name"] == "Central Park East, Main Pathway"
print(f"[PASS] Report details verified: Priority: {detail1['priority']}, Location: {detail1['location_name']}")

# TEST 7: Verify User Isolation (User 2 citizen cannot access User 1 report without permission)
print("\n[TEST 7] User isolation & permission check...")
# Create a 3rd citizen user
email3 = f"other_citizen_{uuid.uuid4().hex[:6]}@treeguard.org"
code, _ = req(f"{BASE_API}/auth/register", {"full_name": "Bob Stranger", "email": email3, "password": "Password123!", "role": "citizen"}, method="POST")
code, login3 = req(f"{BASE_API}/auth/login", {"email": email3, "password": "Password123!"}, method="POST")
token3 = login3["access_token"]

code7, res7 = req(f"{BASE_API}/reports/{report_id1}", token=token3)
assert code7 == 403, f"Expected 403 Forbidden for unauthorized user, got {code7}"
print(f"[PASS] Unauthorized citizen access rejected with 403 Forbidden: {res7.get('detail')}")

# Inspector (User 2) CAN access report for triage
code_insp, res_insp = req(f"{BASE_API}/reports/{report_id1}", token=token2)
assert code_insp == 200
print(f"[PASS] Inspector role permitted to access report for triage: {res_insp['id']}")

# TEST 8: Verify My Reports list for User 1
print("\n[TEST 8] Listing reports for User 1...")
code8, user1_reports = req(f"{BASE_API}/reports", token=token1)
assert code8 == 200
assert len(user1_reports) >= 2
assert any(r["id"] == report_id1 for r in user1_reports)
assert any(r["id"] == report_id2 for r in user1_reports)
print(f"[PASS] GET /api/reports contains all {len(user1_reports)} reports submitted by User 1")

# TEST 9: Verify Static Image File Retrieval
print("\n[TEST 9] Verify uploaded image is served via static file handler...")
image_url = f"http://127.0.0.1:8000{res1['image_url']}"
with urllib.request.urlopen(image_url) as img_resp:
    assert img_resp.status == 200
    retrieved_bytes = img_resp.read()
    assert retrieved_bytes == png_bytes
    print(f"[PASS] Uploaded PNG correctly served from static storage ({len(retrieved_bytes)} bytes)")

print("\n=================================================================")
print("ALL 9 TEST SUITES & SCENARIOS PASSED WITH 100% SUCCESS!")
print("=================================================================")
