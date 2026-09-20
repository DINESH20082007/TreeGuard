import json
import sys
import uuid
import urllib.request
import urllib.error

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
    except Exception as e:
        return 0, {"error": str(e)}

def run_tests():
    print("==================================================")
    print("STARTING REAL CLIENT ACCESS & ROLE AUTHORIZATION TESTS")
    print("==================================================")

    # Health check
    status, health = request_json("GET", "/api/health")
    if status != 200:
        print(f"Backend not responding on port 8000 (status={status}, resp={health})")
        sys.exit(1)
    print("Backend health check OK!")

    # 1. TEST 1 - Normal Citizen
    print("\n--- TEST 1: Normal Citizen (citizen@treeguard.org) ---")
    st, cit_login = request_json("POST", "/api/auth/login", {
        "email": "citizen@treeguard.org",
        "password": "SecurePassword123!"
    })
    assert st == 200, f"Citizen login failed ({st}): {cit_login}"
    cit_token = cit_login["access_token"]
    cit_user = cit_login["user"]
    print(f"Citizen authenticated: {cit_user['email']} (role: {cit_user['role']}, client_presentation: {cit_user.get('is_client_presentation', False)})")
    
    # Should succeed on citizen endpoints
    st, my_rep = request_json("GET", "/api/reports/my", token=cit_token)
    assert st == 200, f"Citizen my reports failed ({st}): {my_rep}"
    st, trees = request_json("GET", "/api/trees", token=cit_token)
    assert st == 200, f"Citizen trees failed ({st}): {trees}"
    print("[PASS] Citizen successfully accessed Citizen endpoints")

    # Should be DENIED on Inspector assignments and Admin Dashboard
    st, insp_check = request_json("GET", "/api/inspector/assignments", token=cit_token)
    assert st == 403, f"Citizen was NOT forbidden on inspector assignments: {st} {insp_check}"
    st, adm_check = request_json("GET", "/api/admin/dashboard", token=cit_token)
    assert st == 403, f"Citizen was NOT forbidden on admin dashboard: {st} {adm_check}"
    st, analytics_check = request_json("GET", "/api/analytics", token=cit_token)
    assert st == 403, f"Citizen was NOT forbidden on analytics: {st} {analytics_check}"
    print("[PASS] Citizen was correctly blocked (403 Forbidden) from Inspector and Admin endpoints")

    # 2. TEST 2 - Normal Inspector
    print("\n--- TEST 2: Normal Inspector (inspector@treeguard.org) ---")
    st, insp_login = request_json("POST", "/api/auth/login", {
        "email": "inspector@treeguard.org",
        "password": "SecurePassword123!"
    })
    assert st == 200, f"Inspector login failed ({st}): {insp_login}"
    insp_token = insp_login["access_token"]
    insp_user = insp_login["user"]
    print(f"Inspector authenticated: {insp_user['email']} (role: {insp_user['role']})")
    
    st, assignments = request_json("GET", "/api/inspector/assignments", token=insp_token)
    assert st == 200, f"Inspector assignments failed ({st}): {assignments}"
    assert len(assignments) > 0, "Inspector has no assignments seeded"
    print(f"[PASS] Inspector retrieved {len(assignments)} real assignments")

    st, insp_stats = request_json("GET", "/api/inspector/stats", token=insp_token)
    assert st == 200, f"Inspector stats failed ({st}): {insp_stats}"
    print(f"[PASS] Inspector retrieved dashboard stats: {insp_stats}")

    # Inspector denied on admin-only endpoints
    st, adm_check = request_json("GET", "/api/admin/dashboard", token=insp_token)
    assert st == 403, f"Inspector was NOT forbidden on admin dashboard: {st} {adm_check}"
    st, analytics_check = request_json("GET", "/api/analytics", token=insp_token)
    assert st == 403, f"Inspector was NOT forbidden on analytics: {st} {analytics_check}"
    print("[PASS] Inspector was correctly blocked (403 Forbidden) from Admin-only endpoints")

    # 3. TEST 3 - Normal Admin
    print("\n--- TEST 3: Normal Admin (admin@treeguard.org) ---")
    st, adm_login = request_json("POST", "/api/auth/login", {
        "email": "admin@treeguard.org",
        "password": "SecurePassword123!"
    })
    assert st == 200, f"Admin login failed ({st}): {adm_login}"
    adm_token = adm_login["access_token"]
    adm_user = adm_login["user"]
    print(f"Admin authenticated: {adm_user['email']} (role: {adm_user['role']})")

    st, adm_dash = request_json("GET", "/api/admin/dashboard", token=adm_token)
    assert st == 200, f"Admin dashboard failed ({st}): {adm_dash}"
    st, analytics = request_json("GET", "/api/analytics?range=90d", token=adm_token)
    assert st == 200, f"Admin analytics failed ({st}): {analytics}"
    st, mon = request_json("GET", "/api/admin/monitoring", token=adm_token)
    assert st == 200, f"Admin monitoring failed ({st}): {mon}"
    print("[PASS] Admin successfully accessed Admin Dashboard, Analytics, and Monitoring endpoints")

    # 4. TEST 4 - Dedicated Client Presentation Account
    print("\n--- TEST 4: Client Presentation Account (client@treeguard.org) ---")
    st, client_login = request_json("POST", "/api/auth/login", {
        "email": "client@treeguard.org",
        "password": "SecurePassword123!"
    })
    assert st == 200, f"Client login failed ({st}): {client_login}"
    client_token = client_login["access_token"]
    client_user = client_login["user"]
    print(f"Client Presentation Account authenticated: {client_user['email']}")
    assert client_user.get("is_client_presentation") == True or client_user.get("can_access_all_dashboards") == True, "Client presentation flags missing"
    print(f"Verified multi-dashboard capability flag: is_client_presentation={client_user.get('is_client_presentation')}, can_access_all_dashboards={client_user.get('can_access_all_dashboards')}")

    # Area 1: Citizen
    print("\n-> Testing Area 1: Citizen Experience for Client Account...")
    st, cit_trees = request_json("GET", "/api/trees", token=client_token)
    assert st == 200, f"Client failed to fetch trees ({st}): {cit_trees}"
    st, cit_notifs = request_json("GET", "/api/notifications", token=client_token)
    assert st == 200, f"Client failed to fetch notifications ({st}): {cit_notifs}"
    st, cit_my_reports = request_json("GET", "/api/reports/my", token=client_token)
    assert st == 200, f"Client failed to fetch my reports ({st}): {cit_my_reports}"
    print("[PASS] Client Presentation Account has full access to Citizen endpoints")

    # Area 2: Field Inspector
    print("\n-> Testing Area 2: Field Inspector Experience for Client Account...")
    st, client_asns = request_json("GET", "/api/inspector/assignments", token=client_token)
    assert st == 200, f"Client failed to fetch inspector assignments ({st}): {client_asns}"
    assert len(client_asns) > 0, "Client has no inspector assignments"
    st, client_stats = request_json("GET", "/api/inspector/stats", token=client_token)
    assert st == 200, f"Client failed to fetch inspector stats ({st}): {client_stats}"
    print(f"[PASS] Client Presentation Account has full access to Field Inspector endpoints ({len(client_asns)} assignments)")

    # Test real workflow action as inspector
    first_asn = client_asns[0]
    st, wf_res = request_json(
        "PATCH",
        f"/api/inspector/assignments/{first_asn['id']}/workflow",
        data={"action": "start_inspection", "inspection_status": "In Progress"},
        token=client_token
    )
    assert st == 200, f"Workflow update failed ({st}): {wf_res}"
    print(f"[PASS] Client completed real workflow update on assignment {first_asn['id']} -> Status: {wf_res['inspection_status']}")

    # Area 3: Organization Admin
    print("\n-> Testing Area 3: Organization Admin Experience for Client Account...")
    st, client_adm_dash = request_json("GET", "/api/admin/dashboard", token=client_token)
    assert st == 200, f"Client failed to fetch admin dashboard ({st}): {client_adm_dash}"
    st, client_analytics = request_json("GET", "/api/analytics?range=90d", token=client_token)
    assert st == 200, f"Client failed to fetch analytics ({st}): {client_analytics}"
    st, client_mon = request_json("GET", "/api/admin/monitoring", token=client_token)
    assert st == 200, f"Client failed to fetch monitoring ({st}): {client_mon}"
    print("[PASS] Client Presentation Account has full access to Organization Admin endpoints")

    print("\n==================================================")
    print("ALL TESTS PASSED SUCCESSFULLY! REAL CLIENT ACCESS VERIFIED.")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"Error during verification: {e}")
        sys.exit(1)
