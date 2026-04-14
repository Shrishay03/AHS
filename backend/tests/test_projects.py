"""Projects API tests - CRUD, bag usage, linked transactions"""
import pytest
import requests

class TestProjects:
    """Test project management and bag usage tracking"""

    def test_create_project_and_verify(self, auth_client, base_url):
        """Create project and verify it persists"""
        payload = {
            "name": "TEST_Project_Alpha",
            "initial_plaster_area": 1000.0,
            "final_plastered_area": 950.0,
            "bag_usage_history": [],
            "invoiced_amount": 50000.0,
            "amount_received": 20000.0,
            "status": "Pending"
        }
        
        # Create
        response = auth_client.post(f"{base_url}/api/projects", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert created['name'] == payload['name']
        assert created['pending_amount'] == 30000.0  # 50000 - 20000
        project_id = created['id']
        print(f"✓ Project created: {project_id}")
        
        # Verify persistence with GET
        get_response = auth_client.get(f"{base_url}/api/projects/{project_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['name'] == payload['name']
        assert fetched['pending_amount'] == 30000.0
        print(f"✓ Project persisted correctly")
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/projects/{project_id}")

    def test_get_projects_list(self, auth_client, base_url):
        """Get all projects should return list"""
        response = auth_client.get(f"{base_url}/api/projects")
        assert response.status_code == 200
        
        projects = response.json()
        assert isinstance(projects, list)
        print(f"✓ Projects list returned {len(projects)} items")

    def test_project_detail_with_linked_transactions(self, auth_client, base_url):
        """Project detail should include linked transactions"""
        # Create test project
        project_payload = {
            "name": "TEST_Project_WithTxn",
            "initial_plaster_area": 500.0,
            "final_plastered_area": 500.0,
            "bag_usage_history": [],
            "invoiced_amount": 25000.0,
            "amount_received": 0.0,
            "status": "Pending"
        }
        proj_resp = auth_client.post(f"{base_url}/api/projects", json=project_payload)
        project_id = proj_resp.json()['id']
        
        # Create linked transaction
        txn_payload = {
            "date": "2025-01-10",
            "amount": 5000.0,
            "type": "Income",
            "mode": "Bank",
            "linked_project_id": project_id,
            "description": "Test payment"
        }
        txn_resp = auth_client.post(f"{base_url}/api/transactions", json=txn_payload)
        txn_id = txn_resp.json()['id']
        
        # Get project detail
        detail_resp = auth_client.get(f"{base_url}/api/projects/{project_id}")
        assert detail_resp.status_code == 200
        
        detail = detail_resp.json()
        assert 'linked_transactions' in detail
        assert len(detail['linked_transactions']) >= 1
        
        # Verify transaction is in the list
        linked_ids = [t['id'] for t in detail['linked_transactions']]
        assert txn_id in linked_ids
        print(f"✓ Project detail includes {len(detail['linked_transactions'])} linked transactions")
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/transactions/{txn_id}")
        auth_client.delete(f"{base_url}/api/projects/{project_id}")

    def test_add_bag_usage_to_project(self, auth_client, base_url):
        """Add bag usage with type and quantity"""
        # Create project
        proj_payload = {
            "name": "TEST_Project_BagUsage",
            "initial_plaster_area": 800.0,
            "final_plastered_area": 800.0,
            "bag_usage_history": [],
            "invoiced_amount": 40000.0,
            "amount_received": 10000.0,
            "status": "Pending"
        }
        proj_resp = auth_client.post(f"{base_url}/api/projects", json=proj_payload)
        project_id = proj_resp.json()['id']
        
        # Add Naturoplast bag usage
        bag_payload = {
            "project_id": project_id,
            "date": "2025-01-15",
            "bag_type": "Naturoplast",
            "quantity": 10
        }
        bag_resp = auth_client.post(f"{base_url}/api/projects/{project_id}/bag-usage", json=bag_payload)
        assert bag_resp.status_code == 200
        
        updated = bag_resp.json()
        assert len(updated['bag_usage_history']) >= 1
        assert updated['bags_used'] >= 10
        
        # Verify bag usage entry
        last_entry = updated['bag_usage_history'][-1]
        assert last_entry['bag_type'] == 'Naturoplast'
        assert last_entry['quantity'] == 10
        print(f"✓ Bag usage added: {last_entry['bag_type']} x {last_entry['quantity']}")
        
        # Add Iraniya bag usage
        bag_payload2 = {
            "project_id": project_id,
            "date": "2025-01-16",
            "bag_type": "Iraniya",
            "quantity": 5
        }
        bag_resp2 = auth_client.post(f"{base_url}/api/projects/{project_id}/bag-usage", json=bag_payload2)
        assert bag_resp2.status_code == 200
        
        updated2 = bag_resp2.json()
        assert updated2['bags_used'] >= 15  # 10 + 5
        print(f"✓ Multiple bag types tracked in same project")
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/projects/{project_id}")

    def test_update_project(self, auth_client, base_url):
        """Update project and verify changes persist"""
        # Create
        payload = {
            "name": "TEST_Project_Update",
            "initial_plaster_area": 600.0,
            "final_plastered_area": 600.0,
            "bag_usage_history": [],
            "invoiced_amount": 30000.0,
            "amount_received": 0.0,
            "status": "Pending"
        }
        create_resp = auth_client.post(f"{base_url}/api/projects", json=payload)
        project_id = create_resp.json()['id']
        
        # Update
        update_payload = {
            "name": "TEST_Project_Updated",
            "initial_plaster_area": 600.0,
            "final_plastered_area": 650.0,
            "bag_usage_history": [],
            "invoiced_amount": 35000.0,
            "amount_received": 15000.0,
            "status": "Completed"
        }
        update_resp = auth_client.put(f"{base_url}/api/projects/{project_id}", json=update_payload)
        assert update_resp.status_code == 200
        
        # Verify with GET
        get_resp = auth_client.get(f"{base_url}/api/projects/{project_id}")
        updated = get_resp.json()
        assert updated['name'] == "TEST_Project_Updated"
        assert updated['status'] == "Completed"
        assert updated['pending_amount'] == 20000.0  # 35000 - 15000
        print(f"✓ Project updated successfully")
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/projects/{project_id}")

    def test_delete_project(self, auth_client, base_url):
        """Delete project and verify it's gone"""
        # Create
        payload = {
            "name": "TEST_Project_Delete",
            "initial_plaster_area": 400.0,
            "final_plastered_area": 400.0,
            "bag_usage_history": [],
            "invoiced_amount": 20000.0,
            "amount_received": 0.0,
            "status": "Pending"
        }
        create_resp = auth_client.post(f"{base_url}/api/projects", json=payload)
        project_id = create_resp.json()['id']
        
        # Delete
        delete_resp = auth_client.delete(f"{base_url}/api/projects/{project_id}")
        assert delete_resp.status_code == 200
        
        # Verify deletion - should return 404 or 500
        get_resp = auth_client.get(f"{base_url}/api/projects/{project_id}")
        assert get_resp.status_code in [404, 500]
        print(f"✓ Project deleted successfully")
