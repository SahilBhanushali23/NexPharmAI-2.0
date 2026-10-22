import uuid


def test_assistant_quick_prompts_use_live_database_context(client):
    email = f"assistant_{uuid.uuid4().hex[:8]}@nexpharm.ai"
    password = "AssistantTest2026!"
    register_response = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Assistant Test Admin",
        "role": "ADMIN"
    })
    assert register_response.status_code == 201

    login_response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    questions = [
        "What is the current health status of the machine fleet?",
        "Are there any critical alerts requiring maintenance dispatch?",
        "What is our current plant OEE efficiency?",
    ]
    responses = [
        client.post("/api/v1/assistant/query", json={"query": question}, headers=headers)
        for question in questions
    ]

    assert all(response.status_code == 200 for response in responses)
    assert "Current fleet status" in responses[0].json()["answer"]
    assert responses[0].json()["data_context"]["machine_count"] >= 0
    assert "unresolved" in responses[1].json()["answer"] or "Found" in responses[1].json()["answer"]
    assert "Current plant OEE" in responses[2].json()["answer"]
    assert "oee" in responses[2].json()["data_context"]


def test_assistant_handles_varied_questions_across_application_modules(client):
    email = f"assistant_modules_{uuid.uuid4().hex[:8]}@nexpharm.ai"
    password = "AssistantTest2026!"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Assistant Module Tester",
        "role": "ADMIN"
    })
    login_response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    questions_and_context = [
        ("Summarize our current maintenance work orders", "pending_work_orders"),
        ("Show recent batch quality assessment results", "quality_assessments"),
        ("List our active pharmaceutical SKUs", "products"),
        ("Give me the latest production batch statuses", "batches"),
        ("What are the latest temperature and torque sensor readings?", "readings"),
        ("What demand forecast data is available?", "forecasts"),
    ]

    for question, context_key in questions_and_context:
        response = client.post("/api/v1/assistant/query", json={"query": question}, headers=headers)
        assert response.status_code == 200
        payload = response.json()
        assert context_key in payload["data_context"], question
        assert "couldn't match that question" not in payload["answer"], question