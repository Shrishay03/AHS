import pytest
import requests
import os

@pytest.fixture
def api_client():
    """Shared requests session without auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def base_url():
    """Base URL from environment"""
    return os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def auth_token(api_client, base_url):
    """Get auth token by logging in"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "email": "aruvihousingsolutions@gmail.com",
        "password": "Aruvi@2024"
    })
    if response.status_code != 200:
        pytest.skip(f"Auth failed: {response.status_code}")
    return response.json()["token"]

@pytest.fixture
def auth_client(auth_token):
    """Authenticated requests session with Bearer token"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session
