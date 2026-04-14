"""Transactions API tests - CRUD, project linking, balance updates"""
import pytest
import requests

class TestTransactions:
    """Test transaction management with project linking"""

    def test_create_transaction_and_verify(self, api_client, base_url):
        """Create transaction and verify persistence"""
        payload = {
            "date": "2025-01-20",
            "amount": 1000.0,
            "type": "Expense",
            "mode": "Bank",
            "category": "Misc",
            "description": "TEST transaction"
        }
        
        # Get initial balance
        dash_resp = api_client.get(f"{base_url}/api/dashboard")
        initial_bank = dash_resp.json()['bank_balance']
        
        # Create
        response = api_client.post(f"{base_url}/api/transactions", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert created['amount'] == 1000.0
        assert created['type'] == 'Expense'
        txn_id = created['id']
        print(f"✓ Transaction created: {txn_id}")
        
        # Verify balance updated
        dash_resp2 = api_client.get(f"{base_url}/api/dashboard")
        new_bank = dash_resp2.json()['bank_balance']
        assert new_bank == initial_bank - 1000.0, "Bank balance not updated correctly"
        print(f"✓ Bank balance updated: {initial_bank} -> {new_bank}")
        
        # Cleanup
        api_client.delete(f"{base_url}/api/transactions/{txn_id}")

    def test_transaction_with_project_linking(self, api_client, base_url):
        """Transaction should link to project and resolve project name"""
        # Create project first
        proj_payload = {
            "name": "TEST_LinkedProject",
            "initial_plaster_area": 500.0,
            "final_plastered_area": 500.0,
            "bag_usage_history": [],
            "invoiced_amount": 25000.0,
            "amount_received": 0.0,
            "status": "Pending"
        }
        proj_resp = api_client.post(f"{base_url}/api/projects", json=proj_payload)
        project_id = proj_resp.json()['id']
        
        # Create transaction with project link
        txn_payload = {
            "date": "2025-01-21",
            "amount": 5000.0,
            "type": "Income",
            "mode": "Bank",
            "linked_project_id": project_id,
            "description": "Payment from linked project"
        }
        txn_resp = api_client.post(f"{base_url}/api/transactions", json=txn_payload)
        assert txn_resp.status_code == 200
        
        created_txn = txn_resp.json()
        assert created_txn['linked_project_id'] == project_id
        assert created_txn['linked_project_name'] == "TEST_LinkedProject"
        print(f"✓ Transaction linked to project: {created_txn['linked_project_name']}")
        
        # Cleanup
        api_client.delete(f"{base_url}/api/transactions/{created_txn['id']}")
        api_client.delete(f"{base_url}/api/projects/{project_id}")

    def test_transaction_modes(self, api_client, base_url):
        """Test Bank, Petty Cash, and Partner modes"""
        modes_to_test = ['Bank', 'Petty Cash', 'Partner']
        created_ids = []
        
        for mode in modes_to_test:
            payload = {
                "date": "2025-01-22",
                "amount": 100.0,
                "type": "Expense",
                "mode": mode,
                "category": "Misc",
                "description": f"TEST {mode} transaction"
            }
            resp = api_client.post(f"{base_url}/api/transactions", json=payload)
            assert resp.status_code == 200
            created = resp.json()
            assert created['mode'] == mode
            created_ids.append(created['id'])
            print(f"✓ {mode} transaction created")
        
        # Cleanup
        for txn_id in created_ids:
            api_client.delete(f"{base_url}/api/transactions/{txn_id}")

    def test_transaction_categories(self, api_client, base_url):
        """Test expense categories"""
        categories = ['Bags', 'Labor', 'Transport', 'Materials', 'Rent', 'Electricity']
        created_ids = []
        
        for category in categories:
            payload = {
                "date": "2025-01-23",
                "amount": 50.0,
                "type": "Expense",
                "mode": "Bank",
                "category": category,
                "description": f"TEST {category}"
            }
            resp = api_client.post(f"{base_url}/api/transactions", json=payload)
            assert resp.status_code == 200
            created = resp.json()
            assert created['category'] == category
            created_ids.append(created['id'])
        
        print(f"✓ All {len(categories)} expense categories working")
        
        # Cleanup
        for txn_id in created_ids:
            api_client.delete(f"{base_url}/api/transactions/{txn_id}")

    def test_update_transaction_balance_reversal(self, api_client, base_url):
        """Update should reverse old balance and apply new"""
        # Create initial transaction
        payload = {
            "date": "2025-01-24",
            "amount": 2000.0,
            "type": "Expense",
            "mode": "Bank",
            "category": "Misc",
            "description": "TEST update"
        }
        create_resp = api_client.post(f"{base_url}/api/transactions", json=payload)
        txn_id = create_resp.json()['id']
        
        # Get balance after creation
        dash1 = api_client.get(f"{base_url}/api/dashboard").json()
        balance_after_create = dash1['bank_balance']
        
        # Update transaction
        update_payload = {
            "date": "2025-01-24",
            "amount": 3000.0,  # Changed amount
            "type": "Expense",
            "mode": "Bank",
            "category": "Labor",
            "description": "TEST updated"
        }
        update_resp = api_client.put(f"{base_url}/api/transactions/{txn_id}", json=update_payload)
        assert update_resp.status_code == 200
        
        # Verify balance reflects the update (should be -1000 more)
        dash2 = api_client.get(f"{base_url}/api/dashboard").json()
        balance_after_update = dash2['bank_balance']
        
        # The difference should be 1000 (3000 - 2000)
        expected_diff = balance_after_create - 1000.0
        assert balance_after_update == expected_diff, \
            f"Balance not updated correctly: {balance_after_update} != {expected_diff}"
        print(f"✓ Transaction update correctly reversed and reapplied balance")
        
        # Cleanup
        api_client.delete(f"{base_url}/api/transactions/{txn_id}")

    def test_delete_transaction_reverses_balance(self, api_client, base_url):
        """Delete should reverse balance effect"""
        # Get initial balance
        dash1 = api_client.get(f"{base_url}/api/dashboard").json()
        initial_bank = dash1['bank_balance']
        
        # Create transaction
        payload = {
            "date": "2025-01-25",
            "amount": 1500.0,
            "type": "Income",
            "mode": "Bank",
            "description": "TEST delete"
        }
        create_resp = api_client.post(f"{base_url}/api/transactions", json=payload)
        txn_id = create_resp.json()['id']
        
        # Verify balance increased
        dash2 = api_client.get(f"{base_url}/api/dashboard").json()
        assert dash2['bank_balance'] == initial_bank + 1500.0
        
        # Delete
        delete_resp = api_client.delete(f"{base_url}/api/transactions/{txn_id}")
        assert delete_resp.status_code == 200
        
        # Verify balance restored
        dash3 = api_client.get(f"{base_url}/api/dashboard").json()
        assert dash3['bank_balance'] == initial_bank, \
            f"Balance not restored after delete: {dash3['bank_balance']} != {initial_bank}"
        print(f"✓ Transaction delete correctly reversed balance")

    def test_get_transactions_with_filters(self, api_client, base_url):
        """Test transaction filtering by date and mode"""
        # Get all transactions
        resp = api_client.get(f"{base_url}/api/transactions")
        assert resp.status_code == 200
        all_txns = resp.json()
        print(f"✓ Get all transactions: {len(all_txns)} items")
        
        # Filter by mode
        resp_bank = api_client.get(f"{base_url}/api/transactions?mode=Bank")
        assert resp_bank.status_code == 200
        bank_txns = resp_bank.json()
        
        # All should be Bank mode
        for txn in bank_txns:
            assert txn['mode'] == 'Bank'
        print(f"✓ Filter by mode=Bank: {len(bank_txns)} items")
