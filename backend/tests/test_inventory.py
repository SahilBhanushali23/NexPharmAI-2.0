import uuid


def test_stock_adjustments_apply_signed_quantity_delta(client):
    email = f"inventory_{uuid.uuid4().hex[:8]}@nexpharm.ai"
    password = "InventoryTest2026!"
    register_response = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Inventory Test Admin",
        "role": "ADMIN"
    })
    assert register_response.status_code == 201

    login_response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    material_response = client.post("/api/v1/inventory", json={
        "material_code": f"MAT-TEST-{uuid.uuid4().hex[:8].upper()}",
        "material_name": "Stock Adjustment Test Material",
        "category": "EXCIPIENT",
        "quantity": 20,
        "unit": "kg",
        "reorder_level": 5
    }, headers=headers)
    assert material_response.status_code == 201
    material_id = material_response.json()["id"]

    receipt_response = client.post(f"/api/v1/inventory/{material_id}/adjust", json={
        "quantity_delta": 10,
        "transaction_type": "RECEIVE",
        "notes": "Supplier delivery"
    }, headers=headers)
    assert receipt_response.status_code == 200
    assert receipt_response.json()["new_quantity"] == 30

    consumption_response = client.post(f"/api/v1/inventory/{material_id}/adjust", json={
        "quantity_delta": -4,
        "transaction_type": "CONSUME",
        "notes": "Production consumption"
    }, headers=headers)
    assert consumption_response.status_code == 200
    assert consumption_response.json()["new_quantity"] == 26