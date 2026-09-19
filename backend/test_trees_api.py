import urllib.request
import json
import sys

def test_get_tree(tree_id: str, expected_species: str, expected_status: str, expected_score: int):
    url = f"http://127.0.0.1:8000/api/trees/{tree_id}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())
        assert data["id"] == tree_id, f"Expected ID {tree_id}, got {data['id']}"
        assert data["species"] == expected_species, f"Expected species {expected_species}, got {data['species']}"
        assert isinstance(data["status"], str) and len(data["status"]) > 0
        assert isinstance(data["health_score"], int) and 0 <= data["health_score"] <= 100
        assert "latitude" in data and isinstance(data["latitude"], float)
        assert "longitude" in data and isinstance(data["longitude"], float)
        assert "location_name" in data and len(data["location_name"]) > 0
        assert "last_inspection" in data
        print(f"[PASS] Tree {tree_id}: {data['species']} ({data['status']}, score {data['health_score']}) @ {data['location_name']}")
        return data

def test_get_tree_risk(tree_id: str, expected_risk: str):
    url = f"http://127.0.0.1:8000/api/trees/{tree_id}/risk"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())
        assert data["tree_id"] == tree_id
        assert data["future_risk"].lower() == expected_risk.lower(), f"Expected risk {expected_risk}, got {data['future_risk']}"
        assert "prediction_horizon" in data
        assert "assessment" in data
        assert "risk_factors" in data and isinstance(data["risk_factors"], list)
        assert "risk_explanation" in data
        assert "recommended_action" in data
        print(f"[PASS] Risk prediction for {tree_id}: {data['future_risk'].upper()} ({data['assessment']})")
        return data

def test_tree_not_found(tree_id: str):
    url = f"http://127.0.0.1:8000/api/trees/{tree_id}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req) as resp:
            raise AssertionError(f"Expected 404 for non-existent tree {tree_id}, got {resp.status}")
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"Expected 404, got {e.code}"
        data = json.loads(e.read().decode())
        assert "detail" in data
        print(f"[PASS] Correctly returned 404 for non-existent tree {tree_id}: {data['detail']}")

if __name__ == "__main__":
    print("==================================================")
    print("RUNNING TREE DETAIL API VERIFICATION SUITE")
    print("==================================================")
    
    # 1. Test Valid Trees
    test_get_tree("TRE-0481", "London Plane", "at-risk", 42)
    test_get_tree("TRE-0392", "American Elm", "monitoring", 68)
    test_get_tree("TRE-0558", "White Oak", "emergency", 24)
    test_get_tree("TRE-0612", "Red Maple", "healthy", 92)
    test_get_tree("TRE-0720", "Japanese Maple", "healthy", 94)

    # 2. Test Dynamic Risk Predictions
    test_get_tree_risk("TRE-0481", "high")
    test_get_tree_risk("TRE-0392", "moderate")
    test_get_tree_risk("TRE-0558", "critical")
    test_get_tree_risk("TRE-0612", "low")

    # 3. Test 404 Not Found
    test_tree_not_found("DOES-NOT-EXIST")
    test_tree_not_found("TRE-9999-FAKE")

    print("\n==================================================")
    print("ALL TREE DETAIL BACKEND TESTS PASSED 100%!")
    print("==================================================")
