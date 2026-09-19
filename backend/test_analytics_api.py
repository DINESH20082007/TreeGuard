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

def test_analytics_suite():
    print("\n=================================================================")
    print("RUNNING TREEGUARD ANALYTICS REAL BACKEND TEST SUITE")
    print("=================================================================")

    # 1. Health check
    status, health_data = request_json("GET", "/api/health")
    assert status == 200, f"Health check failed: {health_data}"
    print("\n[STEP 1] Testing Backend Health Check...")
    print("  [PASS] Backend health check OK.")

    # 2. Register users
    uid = uuid.uuid4().hex[:6]
    citizen_email = f"analytics_citizen_{uid}@treeguard.org"
    inspector_email = f"analytics_inspector_{uid}@treeguard.org"
    admin_email = f"analytics_admin_{uid}@treeguard.org"
    pwd = "AnalyticsPass2026!"

    status, _ = request_json("POST", "/api/auth/register", {
        "full_name": "Analytics Citizen",
        "email": citizen_email,
        "password": pwd,
        "role": "citizen"
    })
    assert status == 201

    status, _ = request_json("POST", "/api/auth/register", {
        "full_name": "Analytics Inspector",
        "email": inspector_email,
        "password": pwd,
        "role": "inspector"
    })
    assert status == 201

    status, _ = request_json("POST", "/api/auth/register", {
        "full_name": "Analytics Admin",
        "email": admin_email,
        "password": pwd,
        "role": "admin"
    })
    assert status == 201

    # Login
    status, res_c = request_json("POST", "/api/auth/login", {"email": citizen_email, "password": pwd})
    token_citizen = res_c["access_token"]

    status, res_i = request_json("POST", "/api/auth/login", {"email": inspector_email, "password": pwd})
    token_inspector = res_i["access_token"]

    status, res_a = request_json("POST", "/api/auth/login", {"email": admin_email, "password": pwd})
    token_admin = res_a["access_token"]

    print("\n[STEP 2] Authenticating Roles (Citizen, Inspector, Admin)...")
    print(f"  [PASS] Citizen authenticated: {citizen_email}")
    print(f"  [PASS] Inspector authenticated: {inspector_email}")
    print(f"  [PASS] Admin authenticated: {admin_email}")

    # 3. Unauthenticated security check
    print("\n[STEP 3] Testing Unauthenticated Rejection (401)...")
    status, _ = request_json("GET", "/api/analytics")
    assert status == 401, f"Expected 401 for unauthenticated request, got {status}"
    print("  [PASS] Unauthenticated request correctly rejected with 401.")

    # 4. Citizen access check (403)
    print("\n[STEP 4] Verifying Citizen Access Rejection (403)...")
    status, res = request_json("GET", "/api/analytics", token=token_citizen)
    assert status == 403, f"Expected 403 Forbidden for citizen, got {status}: {res}"
    print(f"  [PASS] Citizen rejected with 403: {res.get('detail')}")

    # 5. Inspector access check (403)
    print("\n[STEP 5] Verifying Field Inspector Access Rejection (403)...")
    status, res = request_json("GET", "/api/analytics", token=token_inspector)
    assert status == 403, f"Expected 403 Forbidden for inspector, got {status}: {res}"
    print(f"  [PASS] Inspector rejected with 403: {res.get('detail')}")

    # 6. Admin access with default range (90d)
    print("\n[STEP 6] Testing Admin Analytics Retrieval (GET /api/analytics)...")
    status, analytics = request_json("GET", "/api/analytics?range=90d", token=token_admin)
    assert status == 200, f"Analytics request failed: {analytics}"
    print(f"  [PASS] Analytics retrieved successfully for range: {analytics.get('range_label')}")

    # 7. Validate KPI Cards
    print("\n[STEP 7] Validating 4 Analytics KPI Cards...")
    kpis = analytics.get("kpis", [])
    assert len(kpis) == 4, f"Expected 4 KPIs, got {len(kpis)}"
    for k in kpis:
        print(f"  [KPI] {k['label']}: {k['value']} ({k['sub']})")
        assert k["label"] in [
            "Trees requiring inspection",
            "Emergency frequency",
            "Avg. resolution time",
            "Inspection completion rate"
        ]

    # 8. Validate Health Trend Line Data
    print("\n[STEP 8] Validating Health Trend Data...")
    ht = analytics.get("health_trend", [])
    assert len(ht) > 0
    for p in ht:
        print(f"  [TREND] Period: {p['period']} | Healthy: {p['healthy']}% | At Risk: {p['atRisk']}%")
        assert isinstance(p["healthy"], (int, float))
        assert isinstance(p["atRisk"], (int, float))

    # 9. Validate Current Distribution Pie
    print("\n[STEP 9] Validating Current Health Distribution Percentages...")
    cd = analytics.get("current_distribution", [])
    assert len(cd) == 4
    total_pct = sum(slice_item["value"] for slice_item in cd)
    formatted_slices = ", ".join(f"{s['name']}: {s['value']}%" for s in cd)
    print(f"  [PIE] Slices: {formatted_slices} (Total: {total_pct:.1f}%)")
    assert 99.0 <= total_pct <= 101.0, f"Expected sum ~100%, got {total_pct}"

    # 10. Validate Emergency Categories
    print("\n[STEP 10] Validating Emergency Issue Categories...")
    cats = analytics.get("emergency_categories", [])
    assert len(cats) == 6
    for c in cats:
        print(f"  [CAT] {c['name']}: {c['count']} reports")
        assert isinstance(c["count"], int)

    # 11. Validate Geographic Hotspots
    print("\n[STEP 11] Validating Geographic Risk Hotspots...")
    hotspots = analytics.get("hotspots", [])
    assert len(hotspots) == 5
    for h in hotspots:
        print(f"  [HOTSPOT] {h['area']}: {h['emergencies']} emergencies, {h['atRisk']} at risk (Trend: {h['trend']})")
        assert h["trend"] in ["up", "down", "stable"]

    # 12. Validate Environmental Insights
    print("\n[STEP 12] Validating Environmental Insights...")
    insights = analytics.get("insights", [])
    assert len(insights) == 3
    for ins in insights:
        print(f"  [INSIGHT] {ins['icon']} {ins['title']} [{ins['severity']}]: {ins['desc']}")

    # 13. Test All Filter Ranges (7d, 30d, 90d, 1y)
    print("\n[STEP 13] Testing Filter Ranges (7d, 30d, 90d, 1y)...")
    for r in ["7d", "30d", "90d", "1y"]:
        status, r_data = request_json("GET", f"/api/analytics?range={r}", token=token_admin)
        assert status == 200, f"Range {r} query failed"
        assert r_data["range"] == r
        print(f"  [PASS] Range '{r}' successfully retrieved ({r_data['range_label']}). Points: {len(r_data['health_trend'])}")

    print("\n=================================================================")
    print(" ALL ANALYTICS REAL BACKEND TESTS PASSED (100%)!")
    print("=================================================================\n")

if __name__ == "__main__":
    try:
        test_analytics_suite()
    except Exception as e:
        print(f"\n[ERROR] Test failed with exception: {e}")
        sys.exit(1)
