import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

def make_req(url, method="GET", data=None, headers=None):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return e.code, json.loads(err_body) if err_body else {}

def test_api_e2e():
    print("Testing Inspector API Endpoints over HTTP...")

    # 1. Login
    code, res = make_req(f"{BASE_URL}/auth/login", method="POST", data={
        "email": "inspector@treeguard.org",
        "password": "SecurePassword123!"
    })
    assert code == 200, f"Login failed: {code} {res}"
    token = res["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Authenticated as Field Inspector.")

    # 2. Get assignments
    code, assignments = make_req(f"{BASE_URL}/inspector/assignments", headers=headers)
    assert code == 200, f"Get assignments failed: {code} {assignments}"
    assert len(assignments) > 0, "No assignments returned!"
    target = assignments[0]
    print(f"[OK] Fetched {len(assignments)} assignments. Testing target: {target['id']}")

    # 3. Start inspection
    code, res = make_req(
        f"{BASE_URL}/inspector/assignments/{target['id']}/workflow",
        method="PATCH",
        headers=headers,
        data={"action": "start_inspection"}
    )
    assert code == 200, f"Start inspection failed: {code} {res}"
    assert res["inspection_status"] == "In Progress"
    print("[OK] PATCH /workflow (start_inspection) -> In Progress")

    # 4. Complete inspection with service required = True
    code, res = make_req(
        f"{BASE_URL}/inspector/assignments/{target['id']}/workflow",
        method="PATCH",
        headers=headers,
        data={
            "action": "complete_inspection",
            "condition": "Poor",
            "severity": "Moderate",
            "notes": "Limb obstruction observed on DB Road.",
            "recommended_action": "Pruning required",
            "service_required": True,
        }
    )
    assert code == 200, f"Complete inspection failed: {code} {res}"
    assert res["inspection_status"] == "Inspection Completed"
    assert res["service_required"] is True
    assert res["service_status"] == "Required"
    print("[OK] PATCH /workflow (complete_inspection, service_required=True) -> Inspection Completed, Service Required")

    # 5. Start service
    code, res = make_req(
        f"{BASE_URL}/inspector/assignments/{target['id']}/workflow",
        method="PATCH",
        headers=headers,
        data={"action": "start_service"}
    )
    assert code == 200, f"Start service failed: {code} {res}"
    assert res["service_status"] == "Service In Progress"
    print("[OK] PATCH /workflow (start_service) -> Service In Progress")

    # 6. Complete service
    code, res = make_req(
        f"{BASE_URL}/inspector/assignments/{target['id']}/workflow",
        method="PATCH",
        headers=headers,
        data={
            "action": "complete_service",
            "service_performed": "Pruning of overhanging dead limbs",
            "service_notes": "Completed safely using hydraulic lift.",
        }
    )
    assert code == 200, f"Complete service failed: {code} {res}"
    assert res["service_status"] == "Service Completed"
    assert res["status"] == "completed"
    print("[OK] PATCH /workflow (complete_service) -> Service Completed, Overall Completed")

    # 7. Stats
    code, stats = make_req(f"{BASE_URL}/inspector/stats", headers=headers)
    assert code == 200, f"Stats failed: {code} {stats}"
    print(f"[OK] GET /inspector/stats: {stats}")

    # 8. Authorization check: Citizen user cannot access inspector workflow
    code, cit_res = make_req(f"{BASE_URL}/auth/login", method="POST", data={
        "email": "citizen@treeguard.org",
        "password": "SecurePassword123!"
    })
    if code != 200:
        # Register citizen
        make_req(f"{BASE_URL}/auth/register", method="POST", data={
            "email": "citizen@treeguard.org",
            "password": "SecurePassword123!",
            "full_name": "Citizen Ramesh",
            "role": "citizen"
        })
        code, cit_res = make_req(f"{BASE_URL}/auth/login", method="POST", data={
            "email": "citizen@treeguard.org",
            "password": "SecurePassword123!"
        })

    cit_token = cit_res["access_token"]
    cit_headers = {"Authorization": f"Bearer {cit_token}"}

    # Citizen tries to access inspector assignments
    code, _ = make_req(f"{BASE_URL}/inspector/assignments", headers=cit_headers)
    assert code == 403, f"Expected 403 Forbidden for citizen, got {code}"
    print("[OK] Authorization check passed: Citizen cannot access inspector assignments (403 Forbidden).")

    # Citizen tries to update workflow
    code, _ = make_req(
        f"{BASE_URL}/inspector/assignments/{target['id']}/workflow",
        method="PATCH",
        headers=cit_headers,
        data={"action": "start_inspection"}
    )
    assert code == 403, f"Expected 403 Forbidden for citizen updating workflow, got {code}"
    print("[OK] Authorization check passed: Citizen cannot update assignment workflow (403 Forbidden).")

    print("\nALL HTTP API & AUTHORIZATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_api_e2e()
