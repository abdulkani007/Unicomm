from fastapi.testclient import TestClient

def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_me_success(client: TestClient, mock_auth_headers: dict):
    response = client.get("/api/v1/auth/me", headers=mock_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["uid"] == "user123"
    assert data["user"]["role"] == "user"

def test_auth_me_unauthorized(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["success"] is False

def test_predict_sign_success(client: TestClient, mock_auth_headers: dict):
    # Construct sequence of shape (30, 126)
    sequence = [[0.0] * 126 for _ in range(30)]
    payload = {
        "sequence": sequence,
        "model_version": "latest"
    }
    response = client.post("/api/v1/predict/sign", json=payload, headers=mock_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "confidence" in data
    assert "latency_ms" in data

def test_predict_speech_success(client: TestClient, mock_auth_headers: dict):
    # Mock audio file upload
    files = {"file": ("test.webm", b"dummy_audio_bytes", "audio/webm")}
    data = {"target_language": "hi"}
    response = client.post("/api/v1/predict/speech", files=files, data=data, headers=mock_auth_headers)
    assert response.status_code == 200
    data_json = response.json()
    assert "transcription" in data_json
    assert "translation" in data_json

def test_tts_success(client: TestClient, mock_auth_headers: dict):
    payload = {
        "text": "Hello",
        "language_code": "en-US",
        "speaking_rate": 1.0
    }
    response = client.post("/api/v1/predict/tts", data=payload, headers=mock_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "language_code" in data
    assert "speaking_rate" in data

def test_history_crud_flow(client: TestClient, mock_auth_headers: dict):
    # 1. Create history
    history_payload = {
        "mode": "sign-to-speech",
        "originalText": "HELLO",
        "translatedText": "HELLO",
        "sourceLanguage": "en",
        "targetLanguage": "en"
    }
    create_response = client.post("/api/v1/history", json=history_payload, headers=mock_auth_headers)
    assert create_response.status_code in [200, 201]
    created_data = create_response.json()
    assert created_data["originalText"] == "HELLO"
    log_id = created_data["id"]

    # 2. Get history list
    get_response = client.get("/api/v1/history", headers=mock_auth_headers)
    assert get_response.status_code == 200
    logs = get_response.json()
    assert len(logs) > 0
    assert any(log["id"] == log_id for log in logs)

    # 3. Delete history
    delete_response = client.delete(f"/api/v1/history/{log_id}", headers=mock_auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["success"] is True

def test_settings_flow(client: TestClient, mock_auth_headers: dict):
    # Get settings
    get_response = client.get("/api/v1/settings", headers=mock_auth_headers)
    assert get_response.status_code == 200
    settings = get_response.json()
    assert settings["theme"] == "dark"

    # Update settings
    update_payload = {
        "theme": "light",
        "speechSpeed": 1.2,
        "highContrast": True
    }
    put_response = client.put("/api/v1/settings", json=update_payload, headers=mock_auth_headers)
    assert put_response.status_code == 200
    updated_settings = put_response.json()
    assert updated_settings["theme"] == "light"
    assert updated_settings["speechSpeed"] == 1.2
    assert updated_settings["highContrast"] is True
