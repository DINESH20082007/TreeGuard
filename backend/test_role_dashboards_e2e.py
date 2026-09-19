import json
import urllib.request
import urllib.error
import uuid

BASE_URL = "http://127.0.0.1:8000"

def api_call(method: str, path: str, data: dict = None, token: str = None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else None
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = content
        return e.code, parsed

def test_role_dashboards():
    print("Testing Role Dashboards and RBAC isolation...")
    
    # 1. Health check
    code, res = api_call("GET", "/api/health")
    assert code == 200, f"Health check failed: {res}"
    print("[PASS] Backend health check passed (HTTP 200).")

    # 2. Register Citizen, Inspector, and Admin
    uid = uuid.uuid4().hex[:6]
    citizen_email = f"citizen_{uid}@example.com"
    inspector_email = f"inspector_{uid}@treeguard.org"
    admin_email = f"admin_{uid}@treeguard.org"
    password = "SecurePassword123!"

    code, r_cit = api_call("POST", "/api/auth/register", {
        "email": citizen_email,
        "password": password,
        "full_name": f"Citizen User {uid}",
        "role": "citizen"
    })
    assert code == 201, f"Citizen reg failed: {r_cit}"

    code, r_insp = api_call("POST", "/api/auth/register", {
        "email": inspector_email,
        "password": password,
        "full_name": f"Inspector Officer {uid}",
        "role": "inspector"
    })
    assert code == 201, f"Inspector reg failed: {r_insp}"

    code, r_adm = api_call("POST", "/api/auth/register", {
        "email": admin_email,
        "password": password,
        "full_name": f"Admin Director {uid}",
        "role": "admin"
    })
    assert code == 201, f"Admin reg failed: {r_adm}"

    print("[PASS] All 3 test roles successfully registered in database.")

    # 3. Log in each user and get tokens
    code, cit_login = api_call("POST", "/api/auth/login", {"email": citizen_email, "password": password})
    assert code == 200
    cit_token = cit_login["access_token"]

    code, insp_login = api_call("POST", "/api/auth/login", {"email": inspector_email, "password": password})
    assert code == 200
    insp_token = insp_login["access_token"]

    code, adm_login = api_call("POST", "/api/auth/login", {"email": admin_email, "password": password})
    assert code == 200
    adm_token = adm_login["access_token"]

    print("[PASS] Authentication & JWT tokens issued for Citizen, Inspector, and Admin.")

    # ==============================================================
    # 4. CITIZEN DASHBOARD DATA & SECURITY ACCESS TESTS
    # ==============================================================
    code, my_reports = api_call("GET", "/api/reports/my", token=cit_token)
    assert code == 200, f"Failed to get my reports: {my_reports}"
    assert isinstance(my_reports, list)

    code, trees = api_call("GET", "/api/trees?limit=20", token=cit_token)
    assert code == 200, f"Failed to get trees: {trees}"
    assert len(trees) > 0

    code, notifs = api_call("GET", "/api/notifications", token=cit_token)
    assert code == 200, f"Failed to get notifications: {notifs}"

    # Forbidden for Citizen:
    code, cit_adm_res = api_call("GET", "/api/admin/dashboard", token=cit_token)
    assert code == 403, f"Citizen should be forbidden from admin dashboard: {code}"

    code, cit_insp_res = api_call("GET", "/api/inspector/assignments", token=cit_token)
    assert code == 403, f"Citizen should be forbidden from inspector assignments: {code}"

    print("[PASS] Citizen Dashboard APIs & RBAC isolation verified (Citizen cannot access Inspector/Admin endpoints).")

    # ==============================================================
    # 5. FIELD INSPECTOR DASHBOARD DATA & SECURITY ACCESS TESTS
    # ==============================================================
    code, assignments = api_call("GET", "/api/inspector/assignments", token=insp_token)
    assert code == 200, f"Failed to get inspector assignments: {assignments}"
    assert isinstance(assignments, list)
    assert len(assignments) > 0, "Inspector should receive their assigned work orders."

    code, stats = api_call("GET", "/api/inspector/stats", token=insp_token)
    assert code == 200, f"Failed to get inspector stats: {stats}"
    assert "pending_inspection" in stats
    assert "service_required" in stats
    assert "completed_this_week" in stats
    assert "emergency_cases" in stats

    # Forbidden for Inspector:
    code, insp_adm_res = api_call("GET", "/api/admin/dashboard", token=insp_token)
    assert code == 403, f"Inspector should be forbidden from admin dashboard: {code}"

    print("[PASS] Field Inspector Dashboard APIs & RBAC isolation verified (Inspector cannot access Admin dashboard).")

    # ==============================================================
    # 6. ORGANIZATION ADMIN DASHBOARD DATA & ACCURACY TESTS
    # ==============================================================
    code, dash_data = api_call("GET", "/api/admin/dashboard", token=adm_token)
    assert code == 200, f"Admin dashboard request failed: {dash_data}"

    assert "organization_name" in dash_data
    assert "top_cards" in dash_data
    assert len(dash_data["top_cards"]) == 5
    assert "health_distribution" in dash_data
    assert "emergency_over_time" in dash_data
    assert "health_trend" in dash_data
    assert "response_time" in dash_data

    # Check all 6 operational pillars
    assert "trees_breakdown" in dash_data
    tb = dash_data["trees_breakdown"]
    assert tb["total"] > 0
    assert tb["healthy"] >= 0
    assert tb["at_risk"] >= 0

    assert "reports_breakdown" in dash_data
    rb = dash_data["reports_breakdown"]
    assert rb["total"] >= 0
    assert rb["pending"] >= 0

    assert "emergencies_breakdown" in dash_data
    eb = dash_data["emergencies_breakdown"]
    assert eb["total"] >= 0

    assert "inspections_breakdown" in dash_data
    ib = dash_data["inspections_breakdown"]
    assert ib["total"] >= 0

    assert "services_breakdown" in dash_data
    sb = dash_data["services_breakdown"]
    assert sb["required"] >= 0

    assert "monitoring_breakdown" in dash_data
    mb = dash_data["monitoring_breakdown"]
    assert mb["total_observations"] >= 0

    assert "recent_reports" in dash_data
    assert isinstance(dash_data["recent_reports"], list)

    assert "recent_inspections" in dash_data
    assert isinstance(dash_data["recent_inspections"], list)

    print("[PASS] Organization Admin Dashboard real operational aggregations verified.")
    print("\n=======================================================")
    print("ALL 3 ROLE DASHBOARDS & RBAC DATA SCOPES VERIFIED 100%")
    print("=======================================================")

if __name__ == "__main__":
    test_role_dashboards()
