import urllib.request
import urllib.error
import json
import uuid

BASE_API = "http://127.0.0.1:8000/api"

def req(url, data=None, token=None, method="GET"):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
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
print("RUNNING TREEGUARD INSPECTOR DASHBOARD REAL ASSIGNMENTS API TESTS")
print("=================================================================")

# Step 1: Register and login Citizen user
print("\n[STEP 1] Testing Citizen Role Access Control...")
citizen_email = f"citizen_{uuid.uuid4().hex[:6]}@treeguard.org"
password = "Password123!"

code, c_reg = req(f"{BASE_API}/auth/register", {
    "full_name": "Standard Citizen",
    "email": citizen_email,
    "password": password,
    "role": "citizen"
}, method="POST")
assert code == 201, f"Citizen registration failed: {c_reg}"

code, c_login = req(f"{BASE_API}/auth/login", {
    "email": citizen_email,
    "password": password
}, method="POST")
assert code == 200, f"Citizen login failed: {c_login}"
citizen_token = c_login["access_token"]
print(f"  [PASS] Citizen registered & logged in ({citizen_email})")

# Step 2: Verify Citizen cannot access inspector assignments or stats (403 Forbidden)
print("\n[STEP 2] Verifying Citizen is Forbidden from Inspector Endpoints (403)...")
code, res = req(f"{BASE_API}/inspector/assignments", token=citizen_token)
assert code == 403, f"Expected 403 Forbidden for citizen assignments, got {code}: {res}"
print(f"  [PASS] GET /api/inspector/assignments rejected for citizen with 403: {res.get('detail')}")

code, res = req(f"{BASE_API}/inspector/stats", token=citizen_token)
assert code == 403, f"Expected 403 Forbidden for citizen stats, got {code}: {res}"
print(f"  [PASS] GET /api/inspector/stats rejected for citizen with 403: {res.get('detail')}")

# Step 3: Verify Unauthenticated Request Rejection (401)
print("\n[STEP 3] Verifying Unauthenticated Access Rejection (401)...")
code, res = req(f"{BASE_API}/inspector/assignments", token=None)
assert code == 401, f"Expected 401 Unauthorized, got {code}: {res}"
print("  [PASS] Unauthenticated request rejected with 401.")

# Step 4: Register and login Inspector A
print("\n[STEP 4] Authenticating Field Inspector A...")
insp_a_email = f"inspector_a_{uuid.uuid4().hex[:6]}@treeguard.org"
code, a_reg = req(f"{BASE_API}/auth/register", {
    "full_name": "Elena Rostova",
    "email": insp_a_email,
    "password": password,
    "role": "inspector"
}, method="POST")
assert code == 201, f"Inspector A registration failed: {a_reg}"

code, a_login = req(f"{BASE_API}/auth/login", {
    "email": insp_a_email,
    "password": password
}, method="POST")
assert code == 200, f"Inspector A login failed: {a_login}"
token_a = a_login["access_token"]
user_a_id = a_login["user"]["id"]
print(f"  [PASS] Inspector A authenticated: Elena Rostova (ID: {user_a_id})")

# Step 5: Retrieve Inspector A assignments (GET /api/inspector/assignments)
print("\n[STEP 5] Testing GET /api/inspector/assignments for Inspector A...")
code, assignments_a = req(f"{BASE_API}/inspector/assignments", token=token_a)
assert code == 200, f"Expected 200 for Inspector A assignments, got {code}: {assignments_a}"
assert len(assignments_a) >= 4, f"Expected at least 4 assignments for Inspector A, got {len(assignments_a)}"
for asn in assignments_a:
    assert asn["inspector_id"] == user_a_id, f"Assignment does not belong to Inspector A: {asn}"
    assert "id" in asn and "title" in asn and "priority" in asn and "status" in asn
    print(f"  [PASS] Assignment {asn['id']}: [{asn['priority']}] {asn['title']} @ {asn['location_name']} (Status: {asn['status']})")

# Step 6: Test Dynamic Dashboard Stats for Inspector A
print("\n[STEP 6] Testing Calculated Dashboard Stats for Inspector A...")
code, stats_a = req(f"{BASE_API}/inspector/stats", token=token_a)
assert code == 200, f"Expected 200 for stats, got {code}: {stats_a}"
assert "assigned_today" in stats_a
assert "high_priority" in stats_a
assert "pending_inspection" in stats_a
assert "completed_this_week" in stats_a
assert "emergency_cases" in stats_a
assert stats_a["emergency_cases"] >= 1, f"Expected at least 1 emergency case in queue: {stats_a}"
assert stats_a["high_priority"] >= 2, f"Expected at least 2 high priority cases: {stats_a}"
print(f"  [PASS] Computed Stats: Assigned={stats_a['assigned_today']}, HighPri={stats_a['high_priority']}, Pending={stats_a['pending_inspection']}, Completed={stats_a['completed_this_week']}, Emergency={stats_a['emergency_cases']}")

# Step 7: Test Fetching Single Assignment by ID
print("\n[STEP 7] Testing Single Assignment Retrieval by ID...")
first_asn_id = assignments_a[0]["id"]
code, single_asn = req(f"{BASE_API}/inspector/assignments/{first_asn_id}", token=token_a)
assert code == 200, f"Expected 200 for single assignment, got {code}: {single_asn}"
assert single_asn["id"] == first_asn_id
assert single_asn["inspector_id"] == user_a_id
print(f"  [PASS] Single assignment retrieved: {single_asn['id']} — {single_asn['title']}")

# Step 8: Register and login Inspector B to test data isolation
print("\n[STEP 8] Authenticating Field Inspector B & Verifying Isolation...")
insp_b_email = f"inspector_b_{uuid.uuid4().hex[:6]}@treeguard.org"
code, b_reg = req(f"{BASE_API}/auth/register", {
    "full_name": "Marcus Vance",
    "email": insp_b_email,
    "password": password,
    "role": "inspector"
}, method="POST")
assert code == 201

code, b_login = req(f"{BASE_API}/auth/login", {
    "email": insp_b_email,
    "password": password
}, method="POST")
assert code == 200
token_b = b_login["access_token"]
user_b_id = b_login["user"]["id"]
print(f"  [PASS] Inspector B authenticated: Marcus Vance (ID: {user_b_id})")

# Step 9: Verify Inspector B cannot access Inspector A's assignment (403 Forbidden)
print("\n[STEP 9] Verifying Inspector B Cannot Access Inspector A's Assignment (403)...")
code, forbidden_res = req(f"{BASE_API}/inspector/assignments/{first_asn_id}", token=token_b)
assert code == 403, f"Expected 403 Forbidden when Inspector B tries to access Inspector A's assignment, got {code}: {forbidden_res}"
print(f"  [PASS] Cross-inspector unauthorized access rejected with 403: {forbidden_res.get('detail')}")

# Step 10: Verify 404 for Non-Existent Assignment ID
print("\n[STEP 10] Verifying 404 for Non-Existent Assignment ID...")
code, notfound_res = req(f"{BASE_API}/inspector/assignments/TRG-2026-NONEXISTENT", token=token_a)
assert code == 404, f"Expected 404, got {code}: {notfound_res}"
print(f"  [PASS] Non-existent assignment ID returned 404: {notfound_res.get('detail')}")

print("\n=================================================================")
print(" ALL INSPECTOR DASHBOARD BACKEND TESTS PASSED (100%)!")
print("=================================================================")
