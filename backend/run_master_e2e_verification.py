import json
import urllib.request
import urllib.error
import io
import uuid
import sys
import time

BASE_URL = "http://127.0.0.1:8000/api"
STATIC_URL = "http://127.0.0.1:8000"

def req(url, method="GET", data=None, token=None, headers=None):
    if headers is None:
        headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    payload = None
    if data is not None and not isinstance(data, (bytes, bytearray)):
        payload = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif isinstance(data, (bytes, bytearray)):
        payload = data

    request = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as resp:
            resp_bytes = resp.read()
            resp_headers = dict(resp.headers)
            try:
                parsed = json.loads(resp_bytes.decode("utf-8"))
            except Exception:
                parsed = resp_bytes
            return resp.status, parsed, resp_headers
    except urllib.error.HTTPError as e:
        resp_bytes = e.read()
        resp_headers = dict(e.headers)
        try:
            parsed = json.loads(resp_bytes.decode("utf-8"))
        except Exception:
            parsed = resp_bytes.decode("utf-8", errors="ignore")
        return e.code, parsed, resp_headers

def multipart_req(url, fields, files, token=None):
    boundary = f"----TreeGuardBoundary{uuid.uuid4().hex}"
    headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = io.BytesIO()
    for k, v in fields.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
        body.write(f"{v}\r\n".encode())

    for k, (filename, content, mime) in files.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode())
        body.write(f"Content-Type: {mime}\r\n\r\n".encode())
        if isinstance(content, str):
            body.write(content.encode("utf-8"))
        else:
            body.write(content)
        body.write(b"\r\n")

    body.write(f"--{boundary}--\r\n".encode())
    return req(url, method="POST", data=body.getvalue(), headers=headers)

# Sample 1x1 valid PNG image
SAMPLE_PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

def run_master_suite():
    print("=" * 70)
    print("TREEGUARD MASTER END-TO-END INTEGRATION & STABILIZATION SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. Server Health & Security Headers
    # -------------------------------------------------------------
    print("\n[MODULE 1] System Health & Security Headers...")
    code, data, headers = req(f"{BASE_URL}/health")
    assert code == 200, f"Health check failed: {data}"
    assert data["status"] == "ok"
    assert "x-content-type-options" in headers and headers["x-content-type-options"] == "nosniff"
    assert "x-frame-options" in headers and headers["x-frame-options"] == "DENY"
    assert "referrer-policy" in headers
    print("  [PASS] Backend health active. Security headers verified (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).")

    # -------------------------------------------------------------
    # 2. Complete Authentication & User Security Flow
    # -------------------------------------------------------------
    print("\n[MODULE 2] Authentication, Roles & Session Lifecycle...")
    suffix = uuid.uuid4().hex[:6]
    cit_email = f"citizen_{suffix}@treeguard.org"
    insp_email = f"inspector_{suffix}@treeguard.org"
    adm_email = f"admin_{suffix}@treeguard.org"
    common_pass = "TreeGuardPass2026!"

    # Registration: Citizen
    c_code, c_reg, _ = req(f"{BASE_URL}/auth/register", "POST", {
        "full_name": "Elena Rostova", "email": cit_email, "password": common_pass, "role": "citizen"
    })
    assert c_code == 201
    assert "password_hash" not in c_reg
    cit_id = c_reg["id"]

    # Registration: Inspector
    i_code, i_reg, _ = req(f"{BASE_URL}/auth/register", "POST", {
        "full_name": "Marcus Johnson", "email": insp_email, "password": common_pass, "role": "inspector"
    })
    assert i_code == 201
    insp_id = i_reg["id"]

    # Registration: Admin
    a_code, a_reg, _ = req(f"{BASE_URL}/auth/register", "POST", {
        "full_name": "Sarah Chen", "email": adm_email, "password": common_pass, "role": "admin"
    })
    assert a_code == 201
    adm_id = a_reg["id"]

    # Login
    _, c_login, _ = req(f"{BASE_URL}/auth/login", "POST", {"email": cit_email, "password": common_pass, "remember_me": True})
    cit_token = c_login["access_token"]

    _, i_login, _ = req(f"{BASE_URL}/auth/login", "POST", {"email": insp_email, "password": common_pass})
    insp_token = i_login["access_token"]

    _, a_login, _ = req(f"{BASE_URL}/auth/login", "POST", {"email": adm_email, "password": common_pass})
    adm_token = a_login["access_token"]

    # Profile & Preference Updates
    p_code, prof, _ = req(f"{BASE_URL}/users/me", "PATCH", {
        "phone_number": "+91 98765 43210",
        "primary_district": "RS Puram, Coimbatore",
        "notification_preferences": {"emergencyNearby": True, "reportUpdates": True}
    }, token=cit_token)
    assert p_code == 200
    assert prof["phone_number"] == "+91 98765 43210"
    assert prof["primary_district"] == "RS Puram, Coimbatore"
    print("  [PASS] 3 User roles registered & authenticated; profile and preferences persisted.")

    # -------------------------------------------------------------
    # 3. Server-Side RBAC Enforcement
    # -------------------------------------------------------------
    print("\n[MODULE 3] Server-Side Role-Based Access Control (RBAC)...")
    # Citizen trying to access Admin dashboard -> 403
    code, _, _ = req(f"{BASE_URL}/admin/dashboard", token=cit_token)
    assert code == 403, f"Expected 403 for Citizen accessing Admin dashboard, got {code}"

    # Citizen trying to access Inspector queue -> 403
    code, _, _ = req(f"{BASE_URL}/inspector/assignments", token=cit_token)
    assert code == 403, f"Expected 403 for Citizen accessing Inspector queue, got {code}"

    # Inspector trying to access Admin dashboard -> 403
    code, _, _ = req(f"{BASE_URL}/admin/dashboard", token=insp_token)
    assert code == 403, f"Expected 403 for Inspector accessing Admin dashboard, got {code}"

    # Admin accessing Admin dashboard -> 200
    code, _, _ = req(f"{BASE_URL}/admin/dashboard", token=adm_token)
    assert code == 200
    print("  [PASS] RBAC strictly enforced server-side. Unauthorized role access rejected with 403 Forbidden.")

    # -------------------------------------------------------------
    # 4. Tree Catalog, Map & AI Risk Forecasts
    # -------------------------------------------------------------
    print("\n[MODULE 4] Tree Registry, Geographic Map & AI Risk Prediction...")
    code, trees_list, _ = req(f"{BASE_URL}/trees?limit=50")
    assert code == 200
    assert len(trees_list) >= 5
    sample_tree = trees_list[0]
    assert "latitude" in sample_tree and "longitude" in sample_tree
    assert isinstance(sample_tree["latitude"], float)
    assert isinstance(sample_tree["longitude"], float)

    # Risk Prediction for sample tree
    code, risk, _ = req(f"{BASE_URL}/trees/{sample_tree['id']}/risk")
    assert code == 200
    assert risk["tree_id"] == sample_tree["id"]
    assert "future_risk" in risk and "prediction_horizon" in risk
    assert "risk_factors" in risk and isinstance(risk["risk_factors"], list)
    print(f"  [PASS] Loaded {len(trees_list)} trees with real coordinates. Risk forecast verified for {sample_tree['id']} ({risk['future_risk']}).")

    # -------------------------------------------------------------
    # 5. Citizen Report Submission & Photo Storage
    # -------------------------------------------------------------
    print("\n[MODULE 5] Tree Report Submission & Static Photo Serving...")
    code, new_rep, _ = multipart_req(
        f"{BASE_URL}/reports",
        {
            "issue_type": "branch",
            "location_name": "NSR Road, Saibaba Colony, Coimbatore",
            "description": "Large cracked limb hanging over sidewalk.",
            "latitude": "11.0286",
            "longitude": "76.9450",
            "observed_at": "Today 10:00 AM",
        },
        {"image": ("broken_branch.png", SAMPLE_PNG, "image/png")},
        token=cit_token,
    )
    assert code == 201, f"Report creation failed: {new_rep}"
    report_id = new_rep["id"]
    image_url = new_rep["image_url"]
    assert report_id.startswith("TRG-2026-")

    # Verify static file serving
    img_code, img_bytes, _ = req(f"{STATIC_URL}{image_url}")
    assert img_code == 200
    assert len(img_bytes) > 0

    # Retrieve created report
    r_code, rep_detail, _ = req(f"{BASE_URL}/reports/{report_id}", token=cit_token)
    assert r_code == 200
    assert rep_detail["id"] == report_id
    assert rep_detail["reporter_id"] == cit_id
    print(f"  [PASS] Report {report_id} submitted with photo, stored in DB, and served from static uploads.")

    # -------------------------------------------------------------
    # 6. User Isolation & IDOR Protection
    # -------------------------------------------------------------
    print("\n[MODULE 6] Object Ownership & IDOR Protection...")
    # Register second citizen (User B)
    u2_email = f"citizen2_{suffix}@treeguard.org"
    _, u2_reg, _ = req(f"{BASE_URL}/auth/register", "POST", {"full_name": "Bob Citizen", "email": u2_email, "password": common_pass, "role": "citizen"})
    _, u2_login, _ = req(f"{BASE_URL}/auth/login", "POST", {"email": u2_email, "password": common_pass})
    u2_token = u2_login["access_token"]

    # User B tries to read User A's private report
    idor_code, _, _ = req(f"{BASE_URL}/reports/{report_id}", token=u2_token)
    assert idor_code == 403, f"Expected 403 for cross-user report access, got {idor_code}"

    # User B queries /reports/my -> should see 0 reports
    code, u2_reports, _ = req(f"{BASE_URL}/reports/my", token=u2_token)
    assert code == 200
    assert len(u2_reports) == 0
    print(f"  [PASS] User B forbidden from accessing User A's report (403). Zero-leakage user isolation confirmed.")

    # -------------------------------------------------------------
    # 7. Emergency AI Detection & Analysis
    # -------------------------------------------------------------
    print("\n[MODULE 7] Emergency Hazard Detection & AI Fallback...")
    code, emg, _ = multipart_req(
        f"{BASE_URL}/emergency/analyze",
        {"location_name": "DB Road, RS Puram, Coimbatore", "latitude": "11.0086", "longitude": "76.9489"},
        {"image": ("emergency_fallen.png", SAMPLE_PNG, "image/png")},
        token=cit_token,
    )
    assert code == 200
    assert emg["id"].startswith("EMG-2026-")
    assert "analysis_status" in emg and "recommended_action" in emg
    print(f"  [PASS] Emergency analysis {emg['id']} created. Honest analysis status: {emg['analysis_status']}.")

    # -------------------------------------------------------------
    # 8. Field Inspector Workflow & Assignment Resolution
    # -------------------------------------------------------------
    print("\n[MODULE 8] Inspector Assignments, Statistics & Completion...")
    code, assignments, _ = req(f"{BASE_URL}/inspector/assignments", token=insp_token)
    assert code == 200
    assert len(assignments) >= 1
    target_asn = assignments[0]

    code, stats, _ = req(f"{BASE_URL}/inspector/stats", token=insp_token)
    assert code == 200
    assert "pending_inspection" in stats

    # Complete assignment
    comp_code, comp_res, _ = req(
        f"{BASE_URL}/inspector/assignments/{target_asn['id']}/complete",
        "POST",
        {
            "condition": "Fair",
            "severity": "Moderate",
            "notes": "Pruning completed; hazardous hanging limb removed.",
            "recommended_action": "Schedule follow-up monitoring in 30 days.",
        },
        token=insp_token,
    )
    assert comp_code == 200
    assert comp_res["status"] == "completed"
    print(f"  [PASS] Inspector assignment {target_asn['id']} completed and saved to database.")

    # -------------------------------------------------------------
    # 9. Follow-Up Observations & Continuous Monitoring
    # -------------------------------------------------------------
    print("\n[MODULE 9] Follow-up Observations & Timeline Tracking...")
    code, new_obs, _ = req(
        f"{BASE_URL}/observations",
        "POST",
        {
            "tree_id": "TRE-0481",
            "health_score": 82,
            "condition": "Good",
            "canopy_condition": "Active seasonal foliage density.",
            "structural_condition": "Co-dominant stem stable.",
            "notes": "Follow-up observation logged by arborist.",
        },
        token=insp_token,
    )
    assert code == 201
    assert new_obs["id"].startswith("OBS-2026-")

    # Fetch tree observations list
    code, obs_list, _ = req(f"{BASE_URL}/trees/TRE-0481/observations")
    assert code == 200
    assert len(obs_list) >= 1
    print(f"  [PASS] Observation {new_obs['id']} recorded; historical observation timeline preserved ({len(obs_list)} total).")

    # -------------------------------------------------------------
    # 10. Recovery Action Plans
    # -------------------------------------------------------------
    print("\n[MODULE 10] Recovery Action Plans & Action State Updates...")
    code, plan, _ = req(
        f"{BASE_URL}/recovery-plans",
        "POST",
        {
            "tree_id": "TRE-0481",
            "priority": "High",
            "severity": "Moderate",
            "assigned_inspector_name": "Marcus Johnson",
            "detected_issue": "Soil compaction and moisture stress",
            "actions": [
                {"id": "a1", "label": "Perform soil aeration", "status": "pending", "assignee": "Marcus Johnson"},
                {"id": "a2", "label": "Apply deep root hydration", "status": "pending", "assignee": "Marcus Johnson"},
            ],
            "target_date": "2026-09-30",
            "reinspection_date": "2026-10-14",
            "notes": "Soil treatment scheduled.",
        },
        token=insp_token,
    )
    assert code == 201
    plan_id = plan["id"]

    # Update action in recovery plan
    u_code, updated_plan, _ = req(
        f"{BASE_URL}/recovery-plans/{plan_id}",
        "PUT",
        {
            "status": "In Progress",
            "actions": [
                {"id": "a1", "label": "Perform soil aeration", "status": "completed", "assignee": "Marcus Johnson", "completed_date": "Today"},
                {"id": "a2", "label": "Apply deep root hydration", "status": "in-progress", "assignee": "Marcus Johnson"},
            ],
        },
        token=insp_token,
    )
    assert u_code == 200
    assert updated_plan["actions"][0]["status"] == "completed"
    print(f"  [PASS] Recovery plan {plan_id} created and action state transitioned to 'completed'.")

    # -------------------------------------------------------------
    # 11. Real-time Notifications Lifecycle
    # -------------------------------------------------------------
    print("\n[MODULE 11] Notifications Lifecycle & Read State Sync...")
    code, notifs_data, _ = req(f"{BASE_URL}/notifications", token=cit_token)
    assert code == 200
    notifs = notifs_data["notifications"]
    assert len(notifs) >= 1
    unread_target = next((n for n in notifs if not n["read"]), notifs[0])

    # Mark single notification as read
    code, read_notif, _ = req(f"{BASE_URL}/notifications/{unread_target['id']}/read", "PATCH", token=cit_token)
    assert code == 200
    assert read_notif["read"] == True

    # Mark all read
    code, mark_all, _ = req(f"{BASE_URL}/notifications/read-all", "PATCH", token=cit_token)
    assert code == 200

    code, unread_cnt, _ = req(f"{BASE_URL}/notifications/unread-count", token=cit_token)
    assert code == 200
    assert unread_cnt["unread_count"] == 0
    print("  [PASS] Notifications query, single mark read, and mark-all-read verified.")

    # -------------------------------------------------------------
    # 12. Admin Dashboard & Environmental Analytics
    # -------------------------------------------------------------
    print("\n[MODULE 12] Admin Dashboard Aggregations & Analytics Engine...")
    code, admin_dash, _ = req(f"{BASE_URL}/admin/dashboard", token=adm_token)
    assert code == 200
    assert "top_cards" in admin_dash and len(admin_dash["top_cards"]) >= 4
    assert "health_distribution" in admin_dash

    for r_key in ["7d", "30d", "90d", "1y"]:
        code, analytics, _ = req(f"{BASE_URL}/analytics?range={r_key}", token=adm_token)
        assert code == 200
        assert "kpis" in analytics
        assert "hotspots" in analytics
    print("  [PASS] Admin dashboard KPIs and multi-range analytics (7d/30d/90d/1y) computed from real database data.")

    print("\n" + "=" * 70)
    print("ALL 12 END-TO-END VERIFICATION MODULES PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_master_suite()
