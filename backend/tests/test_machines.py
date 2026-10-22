import pytest
import uuid

@pytest.fixture
def auth_headers(client):
    uid = uuid.uuid4().hex[:6]
    admin_email = f"admin_mach_{uid}@nexpharm.ai"
    client.post("/api/v1/auth/register", json={
        "email": admin_email,
        "password": "Password123!",
        "full_name": "Admin Machine Tester",
        "role": "ADMIN"
    })
    login_resp = client.post("/api/v1/auth/login", json={
        "email": admin_email,
        "password": "Password123!"
    })
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_machine_lifecycle(client, auth_headers):
    # 1. Create Production Line
    line_resp = client.post("/api/v1/machines/lines", json={
        "line_code": f"LINE-TAB-{uuid.uuid4().hex[:4].upper()}",
        "name": "Solid Dosage Tableting Line 1",
        "description": "High-speed rotary tablet compression line"
    }, headers=auth_headers)
    assert line_resp.status_code == 201
    line_data = line_resp.json()
    line_code = line_data["line_code"]

    # 2. Create Machine
    machine_id = f"M-{uuid.uuid4().hex[:4].upper()}"
    create_payload = {
        "machine_id": machine_id,
        "machine_name": "Fette Rotary Press 2090",
        "machine_type": "M",
        "production_line": line_code,
        "location": "Suite 104 Cleanroom B",
        "status": "RUNNING"
    }
    mach_resp = client.post("/api/v1/machines", json=create_payload, headers=auth_headers)
    assert mach_resp.status_code == 201
    mach_data = mach_resp.json()
    assert mach_data["machine_id"] == machine_id
    assert mach_data["status"] == "RUNNING"

    # 3. Retrieve Machine by ID
    get_resp = client.get(f"/api/v1/machines/{machine_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["machine_name"] == "Fette Rotary Press 2090"

    # 4. Search and Filter
    list_resp = client.get(f"/api/v1/machines?status=RUNNING&search={machine_id}", headers=auth_headers)
    assert list_resp.status_code == 200
    machines = list_resp.json()
    assert len(machines) == 1
    assert machines[0]["machine_id"] == machine_id

    # 5. Update Status
    patch_resp = client.patch(f"/api/v1/machines/{machine_id}", json={"status": "MAINTENANCE"}, headers=auth_headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "MAINTENANCE"

def test_new_equipment_can_run_failure_prediction_without_readings(client, auth_headers):
    machine_id = f"M-{uuid.uuid4().hex[:8].upper()}"
    create_resp = client.post("/api/v1/machines", json={
        "machine_id": machine_id,
        "machine_name": "New Tablet Press",
        "machine_type": "TABLET_PRESS",
        "production_line": "LINE-1",
        "location": "Cleanroom A",
        "status": "RUNNING"
    }, headers=auth_headers)
    assert create_resp.status_code == 201

    prediction_resp = client.post(
        f"/api/v1/predictive-maintenance/machines/{machine_id}/predict",
        headers=auth_headers
    )

    assert prediction_resp.status_code == 200
    assert "prediction" in prediction_resp.json()
    assert "failure_probability" in prediction_resp.json()["prediction"]
