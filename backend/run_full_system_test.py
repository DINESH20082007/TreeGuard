import urllib.request
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api/auth"

def call(endpoint, data=None, token=None, method="POST"):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.getcode(), json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

print("=== TREEGUARD COMPLETE REAL AUTHENTICATION SYSTEM VERIFICATION ===")

# 1. Register Citizen User
u_id = uuid.uuid4().hex[:6]
dinesh_email = f"dinesh_{u_id}@example.com"
code, reg1 = call("/register", {
    "full_name": "Dinesh",
    "email": dinesh_email,
    "password": "Password123!",
    "role": "citizen"
})
print(f"1. Registration [Citizen: Dinesh]: Status {code} (User ID: {reg1['id']}, Role: {reg1['role']})")
assert code == 201

# 2. Register Inspector User
marcus_email = f"marcus_{u_id}@example.com"
code, reg2 = call("/register", {
    "full_name": "Marcus Johnson",
    "email": marcus_email,
    "password": "Password123!",
    "role": "inspector"
})
print(f"2. Registration [Inspector: Marcus]: Status {code} (User ID: {reg2['id']}, Role: {reg2['role']})")
assert code == 201

# 3. Register Admin User
admin_email = f"admin_{u_id}@example.com"
code, reg3 = call("/register", {
    "full_name": "City Parks Admin",
    "email": admin_email,
    "password": "Password123!",
    "role": "admin"
})
print(f"3. Registration [Admin: City Parks Admin]: Status {code} (User ID: {reg3['id']}, Role: {reg3['role']})")
assert code == 201

# 4. Sign in as Dinesh
code, login1 = call("/login", {
    "email": dinesh_email,
    "password": "Password123!",
    "remember_me": True
})
token_dinesh = login1["access_token"]
print(f"4. Sign In [Dinesh]: Status {code}, Token issued (length {len(token_dinesh)})")
assert code == 200

# 5. Fetch /me as Dinesh
code, me_dinesh = call("/me", token=token_dinesh, method="GET")
print(f"5. Authenticated /me [Dinesh]: Full Name = '{me_dinesh['full_name']}', Role = '{me_dinesh['role']}'")
assert me_dinesh["full_name"] == "Dinesh"
assert me_dinesh["role"] == "citizen"

# 6. Sign in as Marcus
code, login2 = call("/login", {
    "email": marcus_email,
    "password": "Password123!"
})
token_marcus = login2["access_token"]
print(f"6. Sign In [Marcus]: Status {code}, Token issued")
assert code == 200

# 7. Fetch /me as Marcus -> Verify user isolation
code, me_marcus = call("/me", token=token_marcus, method="GET")
print(f"7. Authenticated /me [Marcus]: Full Name = '{me_marcus['full_name']}', Role = '{me_marcus['role']}'")
assert me_marcus["full_name"] == "Marcus Johnson"
assert me_marcus["role"] == "inspector"
assert me_marcus["full_name"] != me_dinesh["full_name"]

# 8. Forgot Password & Reset Token Generation
code, forgot_res = call("/forgot-password", {"email": dinesh_email})
print(f"8. Forgot Password Request: Status {code}, Message = '{forgot_res['message']}'")
assert code == 200

# 9. Test Invalid Credentials
code, err_login = call("/login", {"email": dinesh_email, "password": "WrongPassword"})
print(f"9. Bad Credentials Login: Status {code}, Error = '{err_login['detail']}'")
assert code == 401
assert err_login["detail"] == "Invalid email or password."

# 10. Logout acknowledgment
code, logout_res = call("/logout", token=token_dinesh)
print(f"10. Logout Endpoint: Status {code}, Message = '{logout_res['message']}'")
assert code == 200

print("\n>>> ALL 10 BACKEND AUTHENTICATION SYSTEM TESTS COMPLETED WITH 100% SUCCESS! <<<")
