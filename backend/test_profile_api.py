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

def test_profile_flow():
    print("\n--- Starting Profile API Test Suite ---")
    
    # 1. Health check
    status, health_data = request_json("GET", "/api/health")
    assert status == 200, f"Health check failed: {health_data}"
    print("[PASS] Backend health check passed")

    # 2. Register test users
    uid = uuid.uuid4().hex[:6]
    user_a_email = f"profile_user_a_{uid}@treeguard.org"
    user_b_email = f"profile_user_b_{uid}@treeguard.org"
    pwd_a = "Secret1234!"
    pwd_b = "Secret5678!"

    status, reg_a = request_json("POST", "/api/auth/register", {
        "full_name": "Alice Green",
        "email": user_a_email,
        "password": pwd_a,
        "role": "citizen"
    })
    assert status == 201, f"User A registration failed: {reg_a}"

    status, reg_b = request_json("POST", "/api/auth/register", {
        "full_name": "Bob Inspector",
        "email": user_b_email,
        "password": pwd_b,
        "role": "inspector"
    })
    assert status == 201, f"User B registration failed: {reg_b}"

    # 3. Login
    status, login_a = request_json("POST", "/api/auth/login", {"email": user_a_email, "password": pwd_a})
    assert status == 200, f"User A login failed: {login_a}"
    token_a = login_a["access_token"]

    status, login_b = request_json("POST", "/api/auth/login", {"email": user_b_email, "password": pwd_b})
    assert status == 200, f"User B login failed: {login_b}"
    token_b = login_b["access_token"]

    print("[PASS] Users registered and authenticated successfully")

    # 4. Unauthenticated check
    status, unauth = request_json("GET", "/api/users/me")
    assert status == 401, f"Unauthenticated request should fail with 401, got {status}"
    print("[PASS] Unauthenticated access blocked with 401 Unauthorized")

    # 5. Get User A profile
    status, data_a = request_json("GET", "/api/users/me", token=token_a)
    assert status == 200, f"Get profile failed: {data_a}"
    assert data_a["full_name"] == "Alice Green"
    assert data_a["email"] == user_a_email
    assert data_a["role"] == "citizen"
    print(f"[PASS] Initial profile loaded: {data_a['full_name']} ({data_a['email']}) - Role: {data_a['role']}")

    # 6. Update User A profile
    new_notifs = {
        "emergencyNearby": False,
        "reportUpdates": True,
        "treeAlerts": True,
        "weeklyDigest": True,
        "inspectionCompleted": False
    }
    new_privacy = {
        "locationAccess": True,
        "anonymousReporting": True,
        "dataUsageForAI": False
    }
    update_payload = {
        "full_name": "Alice Green-Smith",
        "phone_number": "+1 (555) 987-6543",
        "primary_district": "Northwoods District",
        "notification_preferences": new_notifs,
        "privacy_settings": new_privacy
    }
    status, patched_data = request_json("PATCH", "/api/users/me", data=update_payload, token=token_a)
    assert status == 200, f"Patch profile failed: {patched_data}"
    assert patched_data["full_name"] == "Alice Green-Smith"
    assert patched_data["phone_number"] == "+1 (555) 987-6543"
    assert patched_data["primary_district"] == "Northwoods District"
    assert patched_data["notification_preferences"] == new_notifs
    assert patched_data["privacy_settings"] == new_privacy
    print("[PASS] Profile update persisted successfully via PATCH /api/users/me")

    # 7. Verify persistent retrieval
    status, refetched_data = request_json("GET", "/api/users/me", token=token_a)
    assert status == 200
    assert refetched_data["full_name"] == "Alice Green-Smith"
    assert refetched_data["primary_district"] == "Northwoods District"
    assert refetched_data["notification_preferences"]["weeklyDigest"] is True
    print("[PASS] Profile retrieved from database matches updated state")

    # 8. User isolation check (User B has distinct profile and defaults)
    status, data_b = request_json("GET", "/api/users/me", token=token_b)
    assert status == 200
    assert data_b["full_name"] == "Bob Inspector"
    assert data_b["role"] == "inspector"
    assert data_b["email"] == user_b_email
    print("[PASS] User isolation verified: User B profile is independent")

    # 9. Change Password Tests
    # 9a. Wrong current password
    status, wrong_pwd_res = request_json("POST", "/api/users/me/change-password", {
        "current_password": "WrongPassword123!",
        "new_password": "NewSecretPass123!"
    }, token=token_a)
    assert status == 400, f"Expected 400 for wrong password, got {status}: {wrong_pwd_res}"
    print("[PASS] Password change with wrong current password rejected (400)")

    # 9b. Too short password
    status, short_pwd_res = request_json("POST", "/api/users/me/change-password", {
        "current_password": pwd_a,
        "new_password": "short"
    }, token=token_a)
    assert status in (400, 422), f"Expected 400/422 for short password, got {status}: {short_pwd_res}"
    print("[PASS] Short password rejected (< 8 chars)")

    # 9c. Successful password change
    new_pwd_a = "BrandNewSecret2026!"
    status, change_res = request_json("POST", "/api/users/me/change-password", {
        "current_password": pwd_a,
        "new_password": new_pwd_a
    }, token=token_a)
    assert status == 200, f"Password change failed: {change_res}"
    print("[PASS] Password successfully updated")

    # 9d. Old password should fail login
    status, old_login = request_json("POST", "/api/auth/login", {"email": user_a_email, "password": pwd_a})
    assert status == 401, f"Old password should not authenticate: {status}"
    print("[PASS] Old password properly invalidated")

    # 9e. New password logs in
    status, new_login = request_json("POST", "/api/auth/login", {"email": user_a_email, "password": new_pwd_a})
    assert status == 200, f"New password login failed: {new_login}"
    print("[PASS] Authenticated with new password successfully")

    print("\n=======================================================")
    print(" ALL PROFILE API TESTS PASSED SUCCESSFULLY! ")
    print("=======================================================\n")

if __name__ == "__main__":
    try:
        test_profile_flow()
    except Exception as e:
        print(f"[ERROR] Test failed with exception: {e}")
        sys.exit(1)
