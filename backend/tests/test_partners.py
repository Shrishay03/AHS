"""Partners API tests - CRUD, transactions, bank balance impact"""
import pytest
import requests

class TestPartners:
    """Test partner management and investment/withdrawal tracking"""

    def test_create_partner_and_verify(self, auth_client, base_url):
        """Create partner and verify persistence"""
        payload = {
            "name": "TEST_Partner_Alpha",
            "total_investment": 50000.0
        }
        
        # Create
        response = auth_client.post(f"{base_url}/api/partners", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert created['name'] == payload['name']
        assert created['total_investment'] == 50000.0
        assert created['current_balance'] == 50000.0
        assert created['total_withdrawals'] == 0
        partner_id = created['id']
        print(f"✓ Partner created: {partner_id}")
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/partners/{partner_id}")

    def test_get_partners_with_transaction_history(self, auth_client, base_url):
        """Get partners should include transaction history"""
        response = auth_client.get(f"{base_url}/api/partners")
        assert response.status_code == 200
        
        partners = response.json()
        assert isinstance(partners, list)
        
        # Each partner should have transaction_history
        for partner in partners:
            assert 'transaction_history' in partner
            assert isinstance(partner['transaction_history'], list)
        
        print(f"✓ Partners list has {len(partners)} partners with transaction history")

    def test_partner_investment_affects_bank_balance(self, auth_client, base_url):
        """Partner investment should increase bank balance"""
        # Create partner
        partner_payload = {
            "name": "TEST_Partner_Investment",
            "total_investment": 0.0
        }
        partner_resp = auth_client.post(f"{base_url}/api/partners", json=partner_payload)
        partner_id = partner_resp.json()['id']
        
        # Get initial bank balance
        dash1 = auth_client.get(f"{base_url}/api/dashboard").json()
        initial_bank = dash1['bank_balance']
        
        # Add investment
        txn_payload = {
            "partner_id": partner_id,
            "amount": 25000.0,
            "type": "Investment",
            "date": "2025-01-29"
        }
        txn_resp = auth_client.post(f"{base_url}/api/partners/transaction", json=txn_payload)
        assert txn_resp.status_code == 200
        print(f"✓ Investment transaction created")
        
        # Verify bank balance increased
        dash2 = auth_client.get(f"{base_url}/api/dashboard").json()
        assert dash2['bank_balance'] == initial_bank + 25000.0, \
            f"Bank balance not updated: {dash2['bank_balance']} != {initial_bank + 25000.0}"
        print(f"✓ Bank balance increased by investment: {initial_bank} -> {dash2['bank_balance']}")
        
        # Verify partner balance updated
        partners = auth_client.get(f"{base_url}/api/partners").json()
        partner = next(p for p in partners if p['id'] == partner_id)
        assert partner['total_investment'] == 25000.0
        assert partner['current_balance'] == 25000.0
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/partners/{partner_id}")

    def test_partner_withdrawal_affects_bank_balance(self, auth_client, base_url):
        """Partner withdrawal should decrease bank balance"""
        # Create partner with investment
        partner_payload = {
            "name": "TEST_Partner_Withdrawal",
            "total_investment": 30000.0
        }
        partner_resp = auth_client.post(f"{base_url}/api/partners", json=partner_payload)
        partner_id = partner_resp.json()['id']
        
        # Get initial bank balance
        dash1 = auth_client.get(f"{base_url}/api/dashboard").json()
        initial_bank = dash1['bank_balance']
        
        # Add withdrawal
        txn_payload = {
            "partner_id": partner_id,
            "amount": 10000.0,
            "type": "Withdrawal",
            "date": "2025-01-30"
        }
        txn_resp = auth_client.post(f"{base_url}/api/partners/transaction", json=txn_payload)
        assert txn_resp.status_code == 200
        print(f"✓ Withdrawal transaction created")
        
        # Verify bank balance decreased
        dash2 = auth_client.get(f"{base_url}/api/dashboard").json()
        assert dash2['bank_balance'] == initial_bank - 10000.0, \
            f"Bank balance not updated: {dash2['bank_balance']} != {initial_bank - 10000.0}"
        print(f"✓ Bank balance decreased by withdrawal: {initial_bank} -> {dash2['bank_balance']}")
        
        # Verify partner balance updated
        partners = auth_client.get(f"{base_url}/api/partners").json()
        partner = next(p for p in partners if p['id'] == partner_id)
        assert partner['total_withdrawals'] == 10000.0
        assert partner['current_balance'] == 20000.0  # 30000 - 10000
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/partners/{partner_id}")

    def test_partner_transaction_creates_bank_transaction(self, auth_client, base_url):
        """Partner investment/withdrawal should create bank transaction entry"""
        # Create partner
        partner_payload = {
            "name": "TEST_Partner_BankTxn",
            "total_investment": 0.0
        }
        partner_resp = auth_client.post(f"{base_url}/api/partners", json=partner_payload)
        partner_id = partner_resp.json()['id']
        partner_name = partner_resp.json()['name']
        
        # Get initial transaction count
        txns1 = auth_client.get(f"{base_url}/api/transactions").json()
        initial_count = len(txns1)
        
        # Add investment
        txn_payload = {
            "partner_id": partner_id,
            "amount": 15000.0,
            "type": "Investment",
            "date": "2025-01-31"
        }
        auth_client.post(f"{base_url}/api/partners/transaction", json=txn_payload)
        
        # Verify bank transaction created
        txns2 = auth_client.get(f"{base_url}/api/transactions").json()
        assert len(txns2) > initial_count
        
        # Find the created transaction
        new_txns = [t for t in txns2 if t not in txns1]
        assert len(new_txns) >= 1
        
        latest = new_txns[-1]
        assert latest['type'] == 'Income'
        assert latest['mode'] == 'Bank'
        assert partner_name in latest['description']
        print(f"✓ Partner investment created bank transaction: {latest['description']}")
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/partners/{partner_id}")

    def test_update_partner(self, auth_client, base_url):
        """Update partner and verify changes"""
        # Create
        payload = {
            "name": "TEST_Partner_Update",
            "total_investment": 20000.0
        }
        create_resp = auth_client.post(f"{base_url}/api/partners", json=payload)
        partner_id = create_resp.json()['id']
        
        # Update
        update_payload = {
            "name": "TEST_Partner_Updated",
            "total_investment": 25000.0
        }
        update_resp = auth_client.put(f"{base_url}/api/partners/{partner_id}", json=update_payload)
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        assert updated['name'] == "TEST_Partner_Updated"
        assert updated['total_investment'] == 25000.0
        print(f"✓ Partner updated successfully")
        
        # Cleanup
        auth_client.delete(f"{base_url}/api/partners/{partner_id}")

    def test_delete_partner(self, auth_client, base_url):
        """Delete partner and verify removal"""
        # Create
        payload = {
            "name": "TEST_Partner_Delete",
            "total_investment": 10000.0
        }
        create_resp = auth_client.post(f"{base_url}/api/partners", json=payload)
        partner_id = create_resp.json()['id']
        
        # Delete
        delete_resp = auth_client.delete(f"{base_url}/api/partners/{partner_id}")
        assert delete_resp.status_code == 200
        
        # Verify deletion
        partners = auth_client.get(f"{base_url}/api/partners").json()
        partner_ids = [p['id'] for p in partners]
        assert partner_id not in partner_ids
        print(f"✓ Partner deleted successfully")
