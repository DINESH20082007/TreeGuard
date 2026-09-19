import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api/auth"

def make_request(endpoint, data=None, headers=None, method="POST"):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.getcode()
            res_body = json.loads(resp.read().decode("utf-8"))
            return status_code, res_body
    except urllib.error.HTTPError as e:
        err_body = json.loads(e.read().decode("utf-8"))
        return e.code, err_body

print("--- 1. Register User ---")
status, res = make_request("/register", {
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "Password123!",
    "role": "citizen"
})
print(f"Status: {status}, Result: {res}")
assert status in (201, 409), f"Unexpected status {status}"

print("\n--- 2. Duplicate Registration Check ---")
status, res = make_request("/register", {
    "full_name": "Duplicate Test",
    "email": "TEST@example.com",
    "password": "Password123!",
    "role": "citizen"
})
print(f"Status: {status}, Result: {res}")
assert status == 409, "Should reject duplicate normalized email"

print("\n--- 3. Login with correct credentials ---")
status, login_res = make_request("/login", {
    "email": "test@example.com",
    "password": "Password123!",
    "remember_me": True
})
print(f"Status: {status}, User: {login_res.get('user')}")
assert status == 200
token = login_res["access_token"]
assert token, "Token must be present"

print("\n--- 4. Login with wrong password ---")
status, err_res = make_request("/login", {
    "email": "test@example.com",
    "password": "WrongPassword999!"
})
print(f"Status: {status}, Detail: {err_res.get('detail')}")
assert status == 401
assert err_res.get("detail") == "Invalid email or password."

print("\n--- 5. Get Current User /api/auth/me ---")
status, me_res = make_request("/me", headers={"Authorization": f"Bearer {token}"}, method="GET")
print(f"Status: {status}, Me: {me_res}")
assert status == 200
assert me_res["email"] == "test@example.com"
assert me_res["full_name"] == "Test User"
assert me_res["role"] == "citizen"

print("\n--- 6. Forgot Password Request ---")
status, forgot_res = make_request("/forgot-password", {
    "email": "test@example.com"
})
print(f"Status: {status}, Result: {forgot_res}")
assert status == 200

print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")
