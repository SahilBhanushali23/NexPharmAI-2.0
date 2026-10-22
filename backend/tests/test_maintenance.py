import uuid
from datetime import datetime, timedelta, timezone


def test_create_maintenance_work_order_and_refresh_list(client):
    email = f"maintenance_{uuid.uuid4().hex[:8]}@nexpharm.ai"
    password = "MaintenanceTest2026!"
    register_response = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Maintenance Test Admin",
        "role": "ADMIN"
    })
    assert register_response.status_code == 201

    login_response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    machine_code = f"M-WO-{uuid.uuid4().hex[:6].upper()}"
    machine_response = client.post("/api/v1/machines", json={
        "machine_id": machine_code,
        "machine_name": "Maintenance Test Machine",
        "machine_type": "M",
        "production_line": "LINE-1",
        "location": "Cleanroom A",
        "status": "RUNNING"
    }, headers=headers)
    assert machine_response.status_code == 201

    create_response = client.post("/api/v1/maintenance", json={
        "machine_id": machine_response.json()["id"],
        "maintenance_type": "PREVENTIVE",
        "reason": "Inspect machine bearings",
        "priority": "HIGH",
        "scheduled_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    }, headers=headers)
    assert create_response.status_code == 201
    created_record = create_response.json()
    assert created_record["reason"] == "Inspect machine bearings"
    assert created_record["status"] == "PENDING"

    refresh_response = client.get("/api/v1/maintenance", headers=headers)
    assert refresh_response.status_code == 200
    assert any(record["id"] == created_record["id"] for record in refresh_response.json())