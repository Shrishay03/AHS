"""Dashboard API tests - financial metrics, balance sheet, bank transactions"""
import pytest
import requests

class TestDashboard:
    """Test dashboard endpoint with all financial metrics"""

    def test_dashboard_loads_successfully(self, api_client, base_url):
        """Dashboard should return 200 and contain all required fields"""
        response = api_client.get(f"{base_url}/api/dashboard")
        assert response.status_code == 200, f"Dashboard failed with {response.status_code}"
        
        data = response.json()
        # Verify all required fields exist
        required_fields = [
            'total_balance', 'bank_balance', 'petty_cash_balance',
            'total_receivables', 'total_income', 'total_expenses',
            'profit_loss', 'total_stock', 'naturoplast_stock', 'iraniya_stock',
            'naturoplast_purchased', 'iraniya_purchased', 'naturoplast_used', 'iraniya_used',
            'total_partner_balance', 'monthly_breakdown', 'bank_transactions'
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Dashboard loaded with all {len(required_fields)} required fields")

    def test_dashboard_balance_calculation(self, api_client, base_url):
        """Total balance should equal bank + petty cash"""
        response = api_client.get(f"{base_url}/api/dashboard")
        data = response.json()
        
        expected_total = data['bank_balance'] + data['petty_cash_balance']
        assert data['total_balance'] == expected_total, \
            f"Total balance mismatch: {data['total_balance']} != {expected_total}"
        print(f"✓ Balance calculation correct: ₹{data['total_balance']}")

    def test_dashboard_profit_loss_calculation(self, api_client, base_url):
        """Profit/Loss should equal income - expenses"""
        response = api_client.get(f"{base_url}/api/dashboard")
        data = response.json()
        
        expected_pl = data['total_income'] - data['total_expenses']
        assert data['profit_loss'] == expected_pl, \
            f"P/L mismatch: {data['profit_loss']} != {expected_pl}"
        print(f"✓ P/L calculation correct: ₹{data['profit_loss']}")

    def test_dashboard_stock_per_bag_type(self, api_client, base_url):
        """Stock should be tracked separately for Naturoplast and Iraniya"""
        response = api_client.get(f"{base_url}/api/dashboard")
        data = response.json()
        
        # Verify per-bag-type tracking
        assert 'naturoplast_stock' in data
        assert 'iraniya_stock' in data
        assert isinstance(data['naturoplast_stock'], (int, float))
        assert isinstance(data['iraniya_stock'], (int, float))
        
        # Total stock should equal sum of both types
        expected_total = data['naturoplast_stock'] + data['iraniya_stock']
        assert data['total_stock'] == expected_total
        print(f"✓ Stock per bag type: Naturoplast={data['naturoplast_stock']}, Iraniya={data['iraniya_stock']}")

    def test_dashboard_monthly_breakdown(self, api_client, base_url):
        """Monthly breakdown should contain income/expense per month"""
        response = api_client.get(f"{base_url}/api/dashboard")
        data = response.json()
        
        monthly = data['monthly_breakdown']
        assert isinstance(monthly, dict)
        
        # If there's data, verify structure
        if monthly:
            for month, vals in monthly.items():
                assert 'income' in vals
                assert 'expense' in vals
                assert isinstance(vals['income'], (int, float))
                assert isinstance(vals['expense'], (int, float))
        print(f"✓ Monthly breakdown has {len(monthly)} months")

    def test_dashboard_bank_transactions_list(self, api_client, base_url):
        """Bank transactions should be filtered to mode=Bank only"""
        response = api_client.get(f"{base_url}/api/dashboard")
        data = response.json()
        
        bank_txns = data['bank_transactions']
        assert isinstance(bank_txns, list)
        
        # All should be Bank mode
        for txn in bank_txns:
            assert txn.get('mode') == 'Bank', f"Non-bank transaction in bank_transactions: {txn}"
        print(f"✓ Bank transactions list has {len(bank_txns)} entries")
