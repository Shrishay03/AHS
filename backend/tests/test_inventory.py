"""Inventory API tests - bag type tracking, purchases, stock calculation"""
import pytest
import requests

class TestInventory:
    """Test inventory management with separate bag type tracking"""

    def test_get_inventory(self, api_client, base_url):
        """Get inventory should return stock breakdown by bag type"""
        response = api_client.get(f"{base_url}/api/inventory")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = [
            'naturoplast_purchased', 'iraniya_purchased',
            'naturoplast_used', 'iraniya_used',
            'naturoplast_stock', 'iraniya_stock',
            'total_purchased', 'total_used', 'current_stock',
            'purchase_history'
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Inventory has all required fields")

    def test_inventory_stock_calculation(self, api_client, base_url):
        """Stock should equal purchased - used for each bag type"""
        response = api_client.get(f"{base_url}/api/inventory")
        data = response.json()
        
        # Naturoplast
        expected_np_stock = data['naturoplast_purchased'] - data['naturoplast_used']
        assert data['naturoplast_stock'] == expected_np_stock, \
            f"Naturoplast stock mismatch: {data['naturoplast_stock']} != {expected_np_stock}"
        
        # Iraniya
        expected_ir_stock = data['iraniya_purchased'] - data['iraniya_used']
        assert data['iraniya_stock'] == expected_ir_stock, \
            f"Iraniya stock mismatch: {data['iraniya_stock']} != {expected_ir_stock}"
        
        # Total
        expected_total = expected_np_stock + expected_ir_stock
        assert data['current_stock'] == expected_total
        print(f"✓ Stock calculations correct: NP={expected_np_stock}, IR={expected_ir_stock}")

    def test_add_inventory_purchase_naturoplast(self, api_client, base_url):
        """Add Naturoplast purchase and verify stock increase"""
        # Get initial stock
        inv1 = api_client.get(f"{base_url}/api/inventory").json()
        initial_np = inv1['naturoplast_purchased']
        initial_bank = api_client.get(f"{base_url}/api/dashboard").json()['bank_balance']
        
        # Add purchase
        payload = {
            "bags": 20,
            "bag_type": "Naturoplast",
            "amount": 4000.0,
            "date": "2025-01-26",
            "mode": "Bank"
        }
        resp = api_client.post(f"{base_url}/api/inventory/purchase", json=payload)
        assert resp.status_code == 200
        print(f"✓ Naturoplast purchase added")
        
        # Verify stock increased
        inv2 = api_client.get(f"{base_url}/api/inventory").json()
        assert inv2['naturoplast_purchased'] == initial_np + 20
        
        # Verify bank balance decreased (expense)
        dash2 = api_client.get(f"{base_url}/api/dashboard").json()
        assert dash2['bank_balance'] == initial_bank - 4000.0
        print(f"✓ Stock and balance updated correctly")

    def test_add_inventory_purchase_iraniya(self, api_client, base_url):
        """Add Iraniya purchase and verify stock increase"""
        # Get initial stock
        inv1 = api_client.get(f"{base_url}/api/inventory").json()
        initial_ir = inv1['iraniya_purchased']
        
        # Add purchase
        payload = {
            "bags": 15,
            "bag_type": "Iraniya",
            "amount": 3500.0,
            "date": "2025-01-27",
            "mode": "Petty Cash"
        }
        resp = api_client.post(f"{base_url}/api/inventory/purchase", json=payload)
        assert resp.status_code == 200
        print(f"✓ Iraniya purchase added")
        
        # Verify stock increased
        inv2 = api_client.get(f"{base_url}/api/inventory").json()
        assert inv2['iraniya_purchased'] == initial_ir + 15
        print(f"✓ Iraniya stock updated")

    def test_inventory_purchase_creates_transaction(self, api_client, base_url):
        """Inventory purchase should create expense transaction"""
        # Get initial transaction count
        txns1 = api_client.get(f"{base_url}/api/transactions").json()
        initial_count = len(txns1)
        
        # Add purchase
        payload = {
            "bags": 10,
            "bag_type": "Naturoplast",
            "amount": 2000.0,
            "date": "2025-01-28",
            "mode": "Bank"
        }
        api_client.post(f"{base_url}/api/inventory/purchase", json=payload)
        
        # Verify transaction created
        txns2 = api_client.get(f"{base_url}/api/transactions").json()
        assert len(txns2) > initial_count
        
        # Find the created transaction
        new_txns = [t for t in txns2 if t not in txns1]
        assert len(new_txns) >= 1
        
        latest = new_txns[-1]
        assert latest['type'] == 'Expense'
        assert latest['category'] == 'Bags'
        assert 'Naturoplast' in latest['description']
        print(f"✓ Purchase created expense transaction: {latest['description']}")

    def test_inventory_purchase_history(self, api_client, base_url):
        """Purchase history should track all purchases"""
        inv = api_client.get(f"{base_url}/api/inventory").json()
        history = inv['purchase_history']
        
        assert isinstance(history, list)
        
        # Verify structure if history exists
        if history:
            for purchase in history:
                assert 'bags' in purchase
                assert 'bag_type' in purchase
                assert 'amount' in purchase
                assert 'date' in purchase
                assert 'mode' in purchase
                assert purchase['bag_type'] in ['Naturoplast', 'Iraniya']
        
        print(f"✓ Purchase history has {len(history)} entries")
