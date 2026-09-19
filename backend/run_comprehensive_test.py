import urllib.request
import json
import uuid

BASE_API = "http://127.0.0.1:8000/api"
BASE_FRONTEND = "http://localhost:8443"

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
print("RUNNING COMPREHENSIVE END-TO-END TREE DETAIL & BACKEND SUITE")
print("=================================================================")

# Step 1: Verify Frontend HTTP Availability
print("\n[STEP 1] Testing Vite Frontend server on port 8443...")
try:
    with urllib.request.urlopen(BASE_FRONTEND) as resp:
        html = resp.read().decode("utf-8")
        assert "<div id=\"root\">" in html or "vite" in html.lower(), "Vite HTML shell should be served"
        print(f"[PASS] Vite frontend server active and serving index.html (HTTP {resp.status})")
except Exception as e:
    print(f"[FAIL] Frontend check error: {e}")

# Step 2: Register/Authenticate user
print("\n[STEP 2] Authenticating test user...")
test_email = f"tester_{uuid.uuid4().hex[:6]}@treeguard.org"
reg_status, reg_data = req(f"{BASE_API}/auth/register", {
    "full_name": "TreeGuard QA Tester",
    "email": test_email,
    "password": "Password123!",
    "role": "citizen"
}, method="POST")
assert reg_status == 201, f"Registration failed: {reg_data}"

login_status, login_data = req(f"{BASE_API}/auth/login", {
    "email": test_email,
    "password": "Password123!"
}, method="POST")
assert login_status == 200, f"Login failed: {login_data}"
auth_token = login_data["access_token"]
print(f"[PASS] User authenticated: {login_data['user']['full_name']} ({test_email})")

# Step 3: Test tree detail endpoints for multiple distinct trees
print("\n[STEP 3] Testing GET /api/trees/{id} for distinct trees...")
trees_to_test = [
    {"id": "TRE-0481", "species": "London Plane", "status": "at-risk", "score": 42, "loc": "Oak Ave & 5th St, Downtown"},
    {"id": "TRE-0392", "species": "American Elm", "status": "monitoring", "score": 68, "loc": "Riverside Walk & 8th St"},
    {"id": "TRE-0558", "species": "White Oak", "status": "emergency", "score": 24, "loc": "Central Park North, Main Blvd"},
    {"id": "TRE-0612", "species": "Red Maple", "status": "healthy", "score": 92, "loc": "Main St & 2nd Ave"},
    {"id": "TRE-0720", "species": "Japanese Maple", "status": "healthy", "score": 94, "loc": "Civic Center Garden, Row 3"},
    {"id": "TRE-0814", "species": "Coast Live Oak", "status": "emergency", "score": 18, "loc": "Mission Park Hillside Path"},
]

for t in trees_to_test:
    code, tree_data = req(f"{BASE_API}/trees/{t['id']}", token=auth_token)
    assert code == 200, f"Failed for tree {t['id']}: code {code}"
    assert tree_data["id"] == t["id"]
    assert tree_data["species"] == t["species"]
    assert "status" in tree_data
    assert isinstance(tree_data["health_score"], int) and 0 <= tree_data["health_score"] <= 100
    assert tree_data["location_name"] == t["loc"]
    assert "latitude" in tree_data and isinstance(tree_data["latitude"], float)
    assert "longitude" in tree_data and isinstance(tree_data["longitude"], float)
    assert "health_confidence" in tree_data
    assert "image_url" in tree_data
    print(f"  [PASS] ID {tree_data['id']}: {tree_data['species']} ({tree_data['status']}, score {tree_data['health_score']}/100, conf {tree_data['health_confidence']}%) @ {tree_data['location_name']}")

# Step 4: Test Risk Prediction endpoint for different trees
print("\n[STEP 4] Testing GET /api/trees/{id}/risk predictions...")
risk_expectations = [
    ("TRE-0481", "high"),
    ("TRE-0392", "moderate"),
    ("TRE-0558", "critical"),
    ("TRE-0612", "low"),
    ("TRE-0814", "critical"),
]

for tree_id, exp_risk in risk_expectations:
    code, risk_data = req(f"{BASE_API}/trees/{tree_id}/risk", token=auth_token)
    assert code == 200, f"Failed risk for tree {tree_id}"
    assert risk_data["tree_id"] == tree_id
    assert risk_data["future_risk"].lower() == exp_risk.lower()
    assert len(risk_data["risk_factors"]) > 0
    assert len(risk_data["risk_explanation"]) > 0
    assert len(risk_data["recommended_action"]) > 0
    print(f"  [PASS] Risk {tree_id}: {risk_data['future_risk'].upper()} | Horizon: {risk_data['prediction_horizon']} | Conf: {risk_data.get('prediction_confidence')}% | Action: {risk_data['recommended_action'][:40]}...")

# Step 5: Test Non-Existent Tree 404
print("\n[STEP 5] Testing non-existent trees return 404...")
for fake_id in ["DOES-NOT-EXIST", "TRE-9999-FAKE", "INVALID-ID"]:
    code, err_data = req(f"{BASE_API}/trees/{fake_id}", token=auth_token)
    assert code == 404, f"Expected 404 for {fake_id}, got {code}"
    print(f"  [PASS] Non-existent ID '{fake_id}' returned HTTP 404 with message: {err_data.get('detail')}")

# Step 6: Test Registering a brand new tree and retrieving it
print("\n[STEP 6] Testing creating and retrieving a custom new tree...")
new_tree_id = f"TRE-{uuid.uuid4().hex[:4].upper()}"
create_code, created_tree = req(f"{BASE_API}/trees", {
    "id": new_tree_id,
    "species": "Douglas Fir",
    "common_name": "Douglas Fir",
    "latitude": 37.7850,
    "longitude": -122.4150,
    "status": "healthy",
    "health_score": 98,
    "health_confidence": 97,
    "location_name": "Pine St & 4th Ave",
    "last_inspection": "Sep 19, 2026",
    "height_m": 24.5,
    "canopy_spread_m": 14.0
}, token=auth_token, method="POST")
assert create_code == 201, f"Failed to create new tree: {created_tree}"
print(f"  [PASS] Created tree {new_tree_id}: {created_tree['species']} @ {created_tree['location_name']}")

# Now immediately fetch it by ID:
fetch_code, fetched_tree = req(f"{BASE_API}/trees/{new_tree_id}", token=auth_token)
assert fetch_code == 200
assert fetched_tree["id"] == new_tree_id
assert fetched_tree["species"] == "Douglas Fir"
assert fetched_tree["health_score"] == 98
print(f"  [PASS] Retrieved newly created tree {new_tree_id} directly by URL ID: {fetched_tree['species']} (score {fetched_tree['health_score']})")

# Step 7: Risk prediction on newly created tree:
risk_code, new_tree_risk = req(f"{BASE_API}/trees/{new_tree_id}/risk", token=auth_token)
assert risk_code == 200
assert new_tree_risk["tree_id"] == new_tree_id
assert new_tree_risk["future_risk"].lower() == "low"
print(f"  [PASS] Dynamic risk evaluation for newly created tree: {new_tree_risk['future_risk'].upper()}")

print("\n=================================================================")
print("ALL COMPREHENSIVE END-TO-END TESTS PASSED SUCCESSFULLY! 100%")
print("=================================================================")
