"""Authentication endpoint tests - login, token validation, protected routes"""
import pytest
import requests

class TestAuth:
    """Test authentication flows and JWT token handling"""

    def test_login_with_correct_credentials(self, api_client, base_url):
        """Login with correct credentials should return token and user data"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "aruvihousingsolutions@gmail.com",
            "password": "Aruvi@2024"
        })
        assert response.status_code == 200, f"Login failed with {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token field"
        assert "user" in data, "Response missing user field"
        assert data["user"]["email"] == "aruvihousingsolutions@gmail.com"
        assert "id" in data["user"]
        assert "name" in data["user"]
        print(f"✓ Login successful with token: {data['token'][:20]}...")

    def test_login_with_wrong_password(self, api_client, base_url):
        """Login with wrong password should return 401"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "aruvihousingsolutions@gmail.com",
            "password": "WrongPassword123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "Invalid email or password" in data["detail"]
        print(f"✓ Wrong password correctly rejected with 401")

    def test_login_with_wrong_email(self, api_client, base_url):
        """Login with non-existent email should return 401"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "Aruvi@2024"
        })
        assert response.status_code == 401
        print(f"✓ Non-existent email correctly rejected with 401")

    def test_login_case_insensitive_email(self, api_client, base_url):
        """Login should work with different email case"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "AruviHousingSolutions@Gmail.com",
            "password": "Aruvi@2024"
        })
        assert response.status_code == 200
        print(f"✓ Case-insensitive email login works")

    def test_get_current_user_with_valid_token(self, auth_client, base_url):
        """GET /api/auth/me with valid token should return user data"""
        response = auth_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert data["email"] == "aruvihousingsolutions@gmail.com"
        print(f"✓ /api/auth/me returns user data with valid token")

    def test_get_current_user_without_token(self, api_client, base_url):
        """GET /api/auth/me without token should return 401"""
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 401
        print(f"✓ /api/auth/me returns 401 without token")

    def test_protected_endpoint_without_auth(self, api_client, base_url):
        """Protected endpoints should return 401 without auth token"""
        endpoints = [
            "/api/dashboard",
            "/api/projects",
            "/api/transactions",
            "/api/inventory",
            "/api/partners"
        ]
        
        for endpoint in endpoints:
            response = api_client.get(f"{base_url}{endpoint}")
            assert response.status_code == 401, f"{endpoint} should return 401 without auth, got {response.status_code}"
        
        print(f"✓ All {len(endpoints)} protected endpoints return 401 without auth")

    def test_protected_endpoint_with_invalid_token(self, api_client, base_url):
        """Protected endpoints should return 401 with invalid token"""
        api_client.headers.update({"Authorization": "Bearer invalid_token_12345"})
        
        response = api_client.get(f"{base_url}/api/dashboard")
        assert response.status_code == 401
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid token correctly rejected with 401")

    def test_protected_endpoint_with_valid_token(self, auth_client, base_url):
        """Protected endpoints should work with valid token"""
        response = auth_client.get(f"{base_url}/api/dashboard")
        assert response.status_code == 200
        print(f"✓ Protected endpoint accessible with valid token")
