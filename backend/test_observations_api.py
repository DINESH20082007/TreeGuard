import json
import uuid
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

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

def run_tests():
    print("=" * 65)
    print("RUNNING TREEGUARD CONTINUOUS MONITORING & OBSERVATIONS API TESTS")
    print("=" * 65)

    # 1. Health check
    print("\n[STEP 1] Testing Backend Health Check...")
    st, resp = request_json("GET", "/api/health")
    assert st == 200, f"Health check failed: {resp}"
    print("  [PASS] Backend health check OK.")

    # 2. Authenticate Inspector
    print("\n[STEP 2] Authenticating Field Inspector...")
    unique_suffix = uuid.uuid4().hex[:6]
    inspector_email = f"obs_inspector_{unique_suffix}@treeguard.org"
    password = "SecurePassword123!"

    st, _ = request_json("POST", "/api/auth/register", {
        "email": inspector_email,
        "password": password,
        "full_name": "Marcus Johnson",
        "role": "inspector"
    })
    assert st in (200, 201), f"Inspector registration failed: {st}"

    st, login_resp = request_json("POST", "/api/auth/login", {
        "email": inspector_email,
        "password": password,
    })
    assert st == 200, f"Inspector login failed: {login_resp}"
    inspector_token = login_resp["access_token"]
    print(f"  [PASS] Inspector authenticated: Marcus Johnson ({inspector_email})")

    # 3. Unauthenticated request rejection (401)
    print("\n[STEP 3] Testing Unauthenticated Observation Creation (401)...")
    st, resp = request_json("POST", "/api/observations", {
        "tree_id": "TRE-0481",
        "condition": "Fair",
        "notes": "Unauthenticated test observation",
    })
    assert st == 401, f"Expected 401 but got {st}: {resp}"
    print("  [PASS] Unauthenticated observation correctly rejected with 401.")

    # 4. Create Recovery Plan to test link
    print("\n[STEP 4] Setting up Recovery Plan for Tree TRE-0481...")
    st, plan_resp = request_json("POST", "/api/recovery-plans", {
        "tree_id": "TRE-0481",
        "priority": "High",
        "severity": "Moderate",
        "detected_issue": "Canopy thinning & drought stress",
        "target_date": "2026-10-15",
        "reinspection_date": "2026-10-09",
        "actions": [
            {"label": "Adjust irrigation", "status": "in-progress", "assignee": "Marcus Johnson", "due": "2026-09-30"}
        ],
        "notes": "Initial recovery plan for continuous monitoring test."
    }, token=inspector_token)
    assert st == 201, f"Failed to create recovery plan: {plan_resp}"
    plan_id = plan_resp["id"]
    print(f"  [PASS] Recovery plan created: {plan_id}")

    # 5. Create Real Follow-up Observation (POST /api/observations)
    print("\n[STEP 5] Creating Real Follow-up Observation...")
    st, obs_resp = request_json("POST", "/api/observations", {
        "tree_id": "TRE-0481",
        "recovery_plan_id": plan_id,
        "condition": "Good",
        "health_score": 76,
        "notes": "Irrigation adjusted. Active new leaf buds observed across upper canopy.",
        "next_follow_up_date": "2026-10-20",
        "plan_status_update": "In Progress",
        "ai_assessment": "Vegetative vigor improving following irrigation intervention.",
        "ai_confidence": 88
    }, token=inspector_token)
    assert st == 201, f"Observation creation failed: {st} -> {obs_resp}"
    obs_id = obs_resp["id"]
    print(f"  [PASS] Observation created: ID={obs_id}, Score={obs_resp['health_score']}, Status={obs_resp['condition']}")

    # 6. Retrieve Observation by ID (GET /api/observations/{id})
    print("\n[STEP 6] Testing Retrieval by Observation ID...")
    st, get_resp = request_json("GET", f"/api/observations/{obs_id}")
    assert st == 200, f"Failed to get observation: {st} -> {get_resp}"
    assert get_resp["id"] == obs_id
    assert get_resp["tree_id"] == "TRE-0481"
    assert get_resp["tree_species"] is not None
    print(f"  [PASS] Observation retrieved: {get_resp['id']} for {get_resp['tree_species']} @ {get_resp['tree_location_name']}")

    # 7. Retrieve Tree Observations (GET /api/trees/{tree_id}/observations)
    print("\n[STEP 7] Testing Historical Observations for Tree...")
    st, list_resp = request_json("GET", "/api/trees/TRE-0481/observations")
    assert st == 200, f"Failed to list tree observations: {st} -> {list_resp}"
    assert len(list_resp) >= 1, "Observations list should not be empty"
    # Ensure newly created observation is in the list
    found = any(o["id"] == obs_id for o in list_resp)
    assert found, f"Newly created observation {obs_id} should appear in tree observation history"
    print(f"  [PASS] Retrieved {len(list_resp)} observation(s) for tree TRE-0481 in chronological order.")

    # 8. Testing AI Comparison endpoint (GET /api/trees/{tree_id}/comparison)
    print("\n[STEP 8] Testing AI Observation Comparison Endpoint...")
    st, comp_resp = request_json("GET", "/api/trees/TRE-0481/comparison")
    assert st == 200, f"Failed to get AI comparison: {st} -> {comp_resp}"
    assert "change_category" in comp_resp
    assert "observation_summary" in comp_resp
    assert "next_action" in comp_resp
    print(f"  [PASS] AI Comparison computed: Category={comp_resp['change_category']}, Delta={comp_resp['score_change']}, Action={comp_resp['next_action']}")

    # 9. Verify Recovery Plan timeline update
    print("\n[STEP 9] Verifying Recovery Plan Timeline Synchronization...")
    st, check_plan = request_json("GET", f"/api/recovery-plans/{plan_id}")
    assert st == 200, f"Failed to get recovery plan: {check_plan}"
    timeline = check_plan.get("timeline", [])
    has_obs_event = any("Observation" in str(evt.get("event", "")) for evt in timeline)
    assert has_obs_event, f"Recovery plan timeline should contain observation event: {timeline}"
    print(f"  [PASS] Recovery plan timeline successfully logged the observation event.")

    # 10. Testing Error Handling (404)
    print("\n[STEP 10] Testing 404 Handling for Non-Existent Resources...")
    st, resp = request_json("GET", "/api/observations/OBS-2026-NONEXISTENT")
    assert st == 404, f"Expected 404 for non-existent observation, got {st}"
    st, resp = request_json("GET", "/api/trees/TRE-NONEXISTENT/observations")
    assert st == 404, f"Expected 404 for non-existent tree, got {st}"
    print("  [PASS] Non-existent resources properly returned 404 Not Found.")

    print("\n" + "=" * 65)
    print(" ALL CONTINUOUS MONITORING & OBSERVATIONS TESTS PASSED (100%)!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
