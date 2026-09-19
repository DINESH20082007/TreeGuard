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
print("RUNNING TREEGUARD RECOVERY PLANS REAL DATABASE API TEST SUITE")
print("=================================================================")

# Step 1: Health check
print("\n[STEP 1] Testing Backend Health Check...")
code, health_data = req(f"{BASE_API}/health")
assert code == 200, f"Health check failed: {health_data}"
print("  [PASS] Backend health check OK.")

# Step 2: Register and authenticate test inspector
print("\n[STEP 2] Authenticating Test Inspector...")
user_email = f"plan_inspector_{uuid.uuid4().hex[:6]}@treeguard.org"
password = "Password123!"

code, reg_res = req(f"{BASE_API}/auth/register", {
    "full_name": "Dr. Aris Vance",
    "email": user_email,
    "password": password,
    "role": "inspector"
}, method="POST")
assert code == 201

code, login_res = req(f"{BASE_API}/auth/login", {
    "email": user_email,
    "password": password
}, method="POST")
assert code == 200
token = login_res["access_token"]
user_id = login_res["user"]["id"]
print(f"  [PASS] Inspector authenticated: {user_email} (ID: {user_id})")

# Step 3: Verify unauthenticated creation fails (401)
print("\n[STEP 3] Testing Unauthenticated Recovery Plan Creation (401)...")
plan_payload = {
    "tree_id": "TRE-0481",
    "priority": "High",
    "severity": "Moderate",
    "assigned_inspector_name": "Marcus Johnson",
    "detected_issue": "Drought and canopy thinning",
    "actions": [
        {"id": "a1", "label": "Inspect soil moisture levels", "status": "pending", "assignee": "Marcus Johnson"}
    ],
    "target_date": "2026-09-25",
    "reinspection_date": "2026-10-09",
    "notes": "Emergency soil hydration and aeration required."
}
code, unauth_res = req(f"{BASE_API}/recovery-plans", data=plan_payload, token=None, method="POST")
assert code == 401, f"Expected 401, got {code}: {unauth_res}"
print("  [PASS] Unauthenticated creation correctly rejected with 401.")

# Step 4: Create a real recovery plan for tree TRE-0481 (201 Created)
print("\n[STEP 4] Testing Creating a Real Recovery Plan (POST /api/recovery-plans)...")
code, created_plan = req(f"{BASE_API}/recovery-plans", data=plan_payload, token=token, method="POST")
assert code == 201, f"Expected 201 Created, got {code}: {created_plan}"
plan_id = created_plan["id"]
assert plan_id.startswith("REC-2026-"), f"Expected REC-2026- prefix, got {plan_id}"
assert created_plan["tree_id"] == "TRE-0481"
assert created_plan["priority"] == "High"
assert created_plan["severity"] == "Moderate"
assert len(created_plan["actions"]) == 1
assert len(created_plan["timeline"]) >= 2
print(f"  [PASS] Recovery plan created: ID={plan_id}, Tree={created_plan['tree_id']}, Actions={len(created_plan['actions'])}")

# Step 5: Retrieve created plan by plan ID (GET /api/recovery-plans/{plan_id})
print("\n[STEP 5] Testing Retrieval by Plan ID (GET /api/recovery-plans/{id})...")
code, fetched_plan = req(f"{BASE_API}/recovery-plans/{plan_id}")
assert code == 200, f"Expected 200, got {code}: {fetched_plan}"
assert fetched_plan["id"] == plan_id
assert fetched_plan["tree_id"] == "TRE-0481"
assert fetched_plan["tree_species"] == "London Plane"
print(f"  [PASS] Plan retrieved by ID with joined tree species: {fetched_plan['tree_species']} @ {fetched_plan['tree_location']}")

# Step 6: Retrieve active plan by Tree ID (GET /api/trees/{tree_id}/recovery-plan)
print("\n[STEP 6] Testing Retrieval by Tree ID (GET /api/trees/{tree_id}/recovery-plan)...")
code, tree_plan = req(f"{BASE_API}/trees/TRE-0481/recovery-plan")
assert code == 200, f"Expected 200, got {code}: {tree_plan}"
assert tree_plan["id"] == plan_id
print(f"  [PASS] Latest active recovery plan fetched for tree TRE-0481: {tree_plan['id']}")

# Step 7: Retrieve all plans for tree (GET /api/trees/{tree_id}/recovery-plans)
print("\n[STEP 7] Testing Listing All Plans for Tree...")
code, all_plans = req(f"{BASE_API}/trees/TRE-0481/recovery-plans")
assert code == 200
assert len(all_plans) >= 1
assert any(p["id"] == plan_id for p in all_plans)
print(f"  [PASS] Found {len(all_plans)} plan(s) for tree TRE-0481.")

# Step 8: Update recovery plan action status & mark as completed (PUT /api/recovery-plans/{plan_id})
print("\n[STEP 8] Testing Updating Recovery Plan & Action Status...")
update_payload = {
    "status": "Completed",
    "actions": [
        {
            "id": "a1",
            "label": "Inspect soil moisture levels",
            "status": "completed",
            "assignee": "Marcus Johnson",
            "due": "2026-09-25",
            "completed_date": "Sep 19, 2026"
        }
    ],
    "notes": "Soil hydration completed. Root moisture restored."
}
code, updated_plan = req(f"{BASE_API}/recovery-plans/{plan_id}", data=update_payload, token=token, method="PUT")
assert code == 200, f"Expected 200 for update, got {code}: {updated_plan}"
assert updated_plan["status"] == "Completed"
assert updated_plan["actions"][0]["status"] == "completed"
assert any(t["event"] == "Plan completed" for t in updated_plan["timeline"]), "Expected 'Plan completed' event in timeline"
print(f"  [PASS] Plan updated: Status={updated_plan['status']}, Action[0]={updated_plan['actions'][0]['status']}")

# Step 9: Verify persistence after database session reload
print("\n[STEP 9] Verifying Long-Term Persistence from DB...")
code, persisted_plan = req(f"{BASE_API}/recovery-plans/{plan_id}")
assert code == 200
assert persisted_plan["status"] == "Completed"
assert persisted_plan["actions"][0]["status"] == "completed"
print("  [PASS] Plan persistence verified directly from PostgreSQL/SQLAlchemy.")

# Step 10: Verify 404 for non-existent plan and tree
print("\n[STEP 10] Testing 404 Errors for Non-Existent Resources...")
code, err404_plan = req(f"{BASE_API}/recovery-plans/REC-2026-NONEXISTENT")
assert code == 404, f"Expected 404, got {code}"
print(f"  [PASS] Non-existent plan ID returned 404: {err404_plan.get('detail')}")

code, err404_tree = req(f"{BASE_API}/trees/TRE-NONEXISTENT/recovery-plan")
assert code == 404, f"Expected 404, got {code}"
print(f"  [PASS] Non-existent tree ID returned 404: {err404_tree.get('detail')}")

print("\n=================================================================")
print(" ALL RECOVERY PLANS REAL DATABASE TESTS PASSED (100%)!")
print("=================================================================")
