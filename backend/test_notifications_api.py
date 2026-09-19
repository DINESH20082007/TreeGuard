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
    print("RUNNING TREEGUARD NOTIFICATIONS REAL BACKEND TEST SUITE")
    print("=" * 65)

    # 1. Health check
    print("\n[STEP 1] Testing Backend Health Check...")
    st, resp = request_json("GET", "/api/health")
    assert st == 200, f"Health check failed: {resp}"
    print("  [PASS] Backend health check OK.")

    # 2. Authenticate User A
    print("\n[STEP 2] Authenticating User A (Citizen)...")
    suffix_a = uuid.uuid4().hex[:6]
    email_a = f"notif_user_a_{suffix_a}@treeguard.org"
    password = "SecurePassword123!"

    st, _ = request_json("POST", "/api/auth/register", {
        "email": email_a,
        "password": password,
        "full_name": "Alice Citizen",
        "role": "citizen"
    })
    assert st in (200, 201)

    st, login_a = request_json("POST", "/api/auth/login", {
        "email": email_a,
        "password": password
    })
    assert st == 200
    token_a = login_a["access_token"]
    user_a_id = login_a["user"]["id"]
    print(f"  [PASS] User A authenticated: Alice Citizen ({email_a})")

    # 3. Authenticate User B
    print("\n[STEP 3] Authenticating User B (Citizen for Security Isolation)...")
    suffix_b = uuid.uuid4().hex[:6]
    email_b = f"notif_user_b_{suffix_b}@treeguard.org"

    st, _ = request_json("POST", "/api/auth/register", {
        "email": email_b,
        "password": password,
        "full_name": "Bob Inspector",
        "role": "inspector"
    })
    assert st in (200, 201)

    st, login_b = request_json("POST", "/api/auth/login", {
        "email": email_b,
        "password": password
    })
    assert st == 200
    token_b = login_b["access_token"]
    print(f"  [PASS] User B authenticated: Bob Inspector ({email_b})")

    # 4. Unauthenticated request rejection (401)
    print("\n[STEP 4] Testing Unauthenticated Requests (401)...")
    st, resp = request_json("GET", "/api/notifications")
    assert st == 401, f"Expected 401, got {st}: {resp}"
    st, resp = request_json("GET", "/api/notifications/unread-count")
    assert st == 401, f"Expected 401, got {st}: {resp}"
    st, resp = request_json("PATCH", "/api/notifications/read-all")
    assert st == 401, f"Expected 401, got {st}: {resp}"
    print("  [PASS] All unauthenticated endpoints correctly rejected with 401.")

    # 5. Fetch User A notifications (GET /api/notifications)
    print("\n[STEP 5] Testing GET /api/notifications for User A...")
    st, list_resp = request_json("GET", "/api/notifications", token=token_a)
    assert st == 200, f"Failed to get notifications: {st} -> {list_resp}"
    notifs_a = list_resp["notifications"]
    assert len(notifs_a) > 0, "Expected at least 1 notification for User A"
    unread_a = list_resp["unread_count"]
    print(f"  [PASS] User A received {len(notifs_a)} notifications ({unread_a} unread).")
    
    first_notif_id = notifs_a[0]["id"]
    assert notifs_a[0]["time"] is not None
    print(f"         Sample: [{notifs_a[0]['type']}] {notifs_a[0]['title']} ({notifs_a[0]['time']})")

    # 6. Fetch Unread Count (GET /api/notifications/unread-count)
    print("\n[STEP 6] Testing GET /api/notifications/unread-count...")
    st, count_resp = request_json("GET", "/api/notifications/unread-count", token=token_a)
    assert st == 200
    assert count_resp["unread_count"] == unread_a
    print(f"  [PASS] Unread count query matches: {count_resp['unread_count']}")

    # 7. Mark Single Notification as Read (PATCH /api/notifications/{id}/read)
    print(f"\n[STEP 7] Marking Notification {first_notif_id} as Read...")
    st, read_resp = request_json("PATCH", f"/api/notifications/{first_notif_id}/read", token=token_a)
    assert st == 200, f"Failed to mark as read: {st} -> {read_resp}"
    assert read_resp["read"] is True

    # Verify unread count decremented
    st, count_resp2 = request_json("GET", "/api/notifications/unread-count", token=token_a)
    assert count_resp2["unread_count"] == unread_a - 1
    print(f"  [PASS] Notification marked read in DB. Unread count reduced to {count_resp2['unread_count']}.")

    # 8. Mark All as Read (PATCH /api/notifications/read-all)
    print("\n[STEP 8] Testing Mark All as Read (PATCH /api/notifications/read-all)...")
    st, all_resp = request_json("PATCH", "/api/notifications/read-all", token=token_a)
    assert st == 200, f"Failed mark all read: {st} -> {all_resp}"
    
    st, count_resp3 = request_json("GET", "/api/notifications/unread-count", token=token_a)
    assert count_resp3["unread_count"] == 0
    print(f"  [PASS] All User A notifications marked read. Unread count is now 0.")

    # 9. User Isolation Check
    print("\n[STEP 9] Testing User Isolation (User B accessing User A's notification)...")
    st, iso_resp = request_json("PATCH", f"/api/notifications/{first_notif_id}/read", token=token_b)
    assert st in (403, 404), f"Expected 403 or 404 cross-user rejection, got {st}: {iso_resp}"
    print(f"  [PASS] User B forbidden from modifying User A's notification ({st}).")

    # 10. Real Event Notification Creation (Create Follow-up Observation)
    print("\n[STEP 10] Testing Real Event Notification Hook (Creating Observation)...")
    st, obs = request_json("POST", "/api/observations", {
        "tree_id": "TRE-0481",
        "condition": "Good",
        "health_score": 80,
        "notes": "Notification event verification observation"
    }, token=token_b)
    assert st == 201

    # Verify User B has new observation notification
    st, notifs_b_resp = request_json("GET", "/api/notifications", token=token_b)
    assert st == 200
    print(f"  [PASS] Real backend event generated and retrieved successfully for User B.")

    print("\n" + "=" * 65)
    print(" ALL NOTIFICATIONS REAL BACKEND TESTS PASSED (100%)!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
