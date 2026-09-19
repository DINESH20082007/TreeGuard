import json
import sys
import uuid
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

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

def test_admin_dashboard():
    print("\n=================================================================")
    print("RUNNING TREEGUARD ADMIN DASHBOARD REAL BACKEND TEST SUITE")
    print("=================================================================")

    # 1. Health check
    status, health_data = request_json("GET", "/api/health")
    assert status == 200, f"Health check failed: {health_data}"
    print("\n[STEP 1] Testing Backend Health Check...")
    print("  [PASS] Backend health check OK.")

    # 2. Register users (Citizen, Inspector, Admin)
    uid = uuid.uuid4().hex[:6]
    citizen_email = f"admin_test_citizen_{uid}@treeguard.org"
    inspector_email = f"admin_test_inspector_{uid}@treeguard.org"
    admin_email = f"admin_test_admin_{uid}@treeguard.org"
    pwd = "AdminTestPass2026!"

    # Register citizen
    status, _ = request_json("POST", "/api/auth/register", {
        "full_name": "Test Citizen",
        "email": citizen_email,
        "password": pwd,
        "role": "citizen"
    })
    assert status == 201, "Citizen registration failed"

    # Register inspector
    status, _ = request_json("POST", "/api/auth/register", {
        "full_name": "Test Inspector",
        "email": inspector_email,
        "password": pwd,
        "role": "inspector"
    })
    assert status == 201, "Inspector registration failed"

    # Register admin
    status, _ = request_json("POST", "/api/auth/register", {
        "full_name": "Admin Director",
        "email": admin_email,
        "password": pwd,
        "role": "admin"
    })
    assert status == 201, "Admin registration failed"

    # Log in all users
    status, res_c = request_json("POST", "/api/auth/login", {"email": citizen_email, "password": pwd})
    token_citizen = res_c["access_token"]

    status, res_i = request_json("POST", "/api/auth/login", {"email": inspector_email, "password": pwd})
    token_inspector = res_i["access_token"]

    status, res_a = request_json("POST", "/api/auth/login", {"email": admin_email, "password": pwd})
    token_admin = res_a["access_token"]

    print("\n[STEP 2] Authenticating Roles (Citizen, Inspector, Organization Admin)...")
    print(f"  [PASS] Citizen authenticated: {citizen_email}")
    print(f"  [PASS] Inspector authenticated: {inspector_email}")
    print(f"  [PASS] Organization Admin authenticated: {admin_email}")

    # 3. Unauthenticated security check
    print("\n[STEP 3] Testing Unauthenticated Access Rejection (401)...")
    status, _ = request_json("GET", "/api/admin/dashboard")
    assert status == 401, f"Expected 401 Unauthorized for unauthenticated request, got {status}"
    print("  [PASS] Unauthenticated request correctly rejected with 401.")

    # 4. Role authorization check for Citizen (403)
    print("\n[STEP 4] Verifying Citizen Access Rejection (403)...")
    status, res = request_json("GET", "/api/admin/dashboard", token=token_citizen)
    assert status == 403, f"Expected 403 Forbidden for citizen, got {status}: {res}"
    print(f"  [PASS] Citizen forbidden from accessing admin dashboard: {res.get('detail')}")

    # 5. Role authorization check for Field Inspector (403)
    print("\n[STEP 5] Verifying Field Inspector Access Rejection (403)...")
    status, res = request_json("GET", "/api/admin/dashboard", token=token_inspector)
    assert status == 403, f"Expected 403 Forbidden for inspector, got {status}: {res}"
    print(f"  [PASS] Inspector forbidden from accessing admin dashboard: {res.get('detail')}")

    # 6. Admin authorized retrieval (200)
    print("\n[STEP 6] Testing Authorized Admin Dashboard Retrieval (GET /api/admin/dashboard)...")
    status, dashboard = request_json("GET", "/api/admin/dashboard", token=token_admin)
    assert status == 200, f"Admin dashboard request failed with status {status}: {dashboard}"
    print(f"  [PASS] Organization Dashboard retrieved: {dashboard.get('organization_name')} · {dashboard.get('current_date')}")

    # 7. Validate Top Cards
    print("\n[STEP 7] Validating Real Top Summary Cards...")
    top_cards = dashboard.get("top_cards", [])
    assert len(top_cards) == 5, f"Expected 5 top cards, got {len(top_cards)}"
    for card in top_cards:
        print(f"  [CARD] {card['icon']} {card['label']}: {card['value']} ({card['delta']})")
        assert card["label"] in [
            "Total Trees Monitored",
            "Trees At Risk",
            "Active Emergencies",
            "Reports This Month",
            "Inspections Completed"
        ]
        assert isinstance(card["value"], str)
        assert len(card["value"]) > 0

    # 8. Validate Health Distribution
    print("\n[STEP 8] Validating Tree Health Distribution...")
    health_dist = dashboard.get("health_distribution", [])
    assert len(health_dist) == 4, f"Expected 4 health distribution categories, got {len(health_dist)}"
    for item in health_dist:
        print(f"  [DIST] {item['name']}: {item['value']} trees (Color: {item['color']})")
        assert item["name"] in ["Healthy", "Monitoring", "At Risk", "Critical"]
        assert isinstance(item["value"], int)

    # 9. Validate Emergency Reports Over Time
    print("\n[STEP 9] Validating 6-Month Emergency Trends...")
    emg_trend = dashboard.get("emergency_over_time", [])
    assert len(emg_trend) == 6, f"Expected 6 monthly buckets, got {len(emg_trend)}"
    for month_data in emg_trend:
        print(f"  [MONTH] {month_data['month']}: {month_data['count']} emergencies")
        assert isinstance(month_data["count"], int)

    # 10. Validate Avg Response Time
    print("\n[STEP 10] Validating Response Times by Priority Tier...")
    resp_times = dashboard.get("response_time", [])
    assert len(resp_times) == 4, f"Expected 4 response time tiers, got {len(resp_times)}"
    for rt in resp_times:
        print(f"  [SLA] {rt['category']}: {rt['hours']} hrs")
        assert rt["category"] in ["Emergency", "High", "Medium", "Low"]
        assert isinstance(rt["hours"], (int, float))

    # 11. Validate Active Emergencies
    print("\n[STEP 11] Validating Active Emergencies Feed...")
    active_emgs = dashboard.get("active_emergencies", [])
    print(f"  [PASS] Retrieved {len(active_emgs)} active emergency records.")
    for emg in active_emgs:
        print(f"  [EMERGENCY] {emg['id']} - {emg['issue']} @ {emg['location']} (Severity: {emg['severity']}, Assigned: {emg['inspector']}, Status: {emg['status']})")
        assert "id" in emg
        assert "issue" in emg
        assert "location" in emg
        assert "severity" in emg

    # 12. Dynamic Mutation Test: Create a new observation and verify stats update
    print("\n[STEP 12] Testing Real Dynamic Dashboard Reactivity...")
    # Seed observation for tree TRE-0481
    status, obs_res = request_json("POST", "/api/observations", {
        "tree_id": "TRE-0481",
        "condition": "Good",
        "health_score": 85,
        "canopy_condition": "Full canopy",
        "structural_condition": "Sound trunk",
        "notes": "Admin dashboard test observation."
    }, token=token_inspector)
    assert status == 201, f"Observation creation failed: {obs_res}"
    print(f"  [PASS] Created observation {obs_res.get('id')}")

    # Re-fetch dashboard and verify summary total_observations incremented
    status, updated_dashboard = request_json("GET", "/api/admin/dashboard", token=token_admin)
    assert status == 200
    new_obs_count = updated_dashboard["summary"]["total_observations"]
    assert new_obs_count >= dashboard["summary"]["total_observations"] + 1, "Expected total observations to increment"
    print(f"  [PASS] Dynamic database reflection verified: Total observations updated to {new_obs_count}.")

    print("\n=================================================================")
    print(" ALL ADMIN DASHBOARD REAL BACKEND TESTS PASSED (100%)!")
    print("=================================================================\n")

if __name__ == "__main__":
    try:
        test_admin_dashboard()
    except Exception as e:
        print(f"\n[ERROR] Test failed with exception: {e}")
        sys.exit(1)
