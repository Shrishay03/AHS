#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Aruvi Housing Solutions Finance Tracking App
Tests all CRUD operations, auto-calculations, balance updates, and error handling
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List
import time

# Backend URL from frontend environment
BACKEND_URL = "https://housing-ledger-5.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_resources = {
            'projects': [],
            'transactions': [],
            'partners': [],
            'inventory_purchases': []
        }
        
    def log_test(self, test_name: str, success: bool, message: str = "", response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'response': response_data
        })
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url)
            else:
                return False, f"Unsupported method: {method}", 400
            
            if response.status_code in [200, 201]:
                return True, response.json(), response.status_code
            else:
                return False, response.text, response.status_code
                
        except requests.exceptions.RequestException as e:
            return False, str(e), 0
    
    def test_dashboard_api(self):
        """Test Dashboard API"""
        print("=== Testing Dashboard API ===")
        
        success, data, status_code = self.make_request('GET', '/dashboard')
        
        if success:
            required_fields = ['total_balance', 'bank_balance', 'petty_cash_balance', 
                             'total_receivables', 'total_expenses', 'total_stock']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Dashboard API - Required Fields", False, 
                            f"Missing fields: {missing_fields}", data)
            else:
                self.log_test("Dashboard API - Required Fields", True, 
                            f"All required fields present: {list(data.keys())}")
                
                # Verify data types
                numeric_fields = ['total_balance', 'bank_balance', 'petty_cash_balance', 
                                'total_receivables', 'total_expenses', 'total_stock']
                type_errors = []
                for field in numeric_fields:
                    if not isinstance(data[field], (int, float)):
                        type_errors.append(f"{field}: {type(data[field])}")
                
                if type_errors:
                    self.log_test("Dashboard API - Data Types", False, 
                                f"Invalid types: {type_errors}")
                else:
                    self.log_test("Dashboard API - Data Types", True, 
                                "All numeric fields have correct types")
        else:
            self.log_test("Dashboard API - Basic Request", False, 
                        f"Status: {status_code}", data)
    
    def test_projects_api(self):
        """Test Projects CRUD operations"""
        print("=== Testing Projects API ===")
        
        # Test GET projects (initially empty)
        success, data, status_code = self.make_request('GET', '/projects')
        if success:
            self.log_test("Projects API - GET (empty)", True, 
                        f"Retrieved {len(data)} projects")
        else:
            self.log_test("Projects API - GET (empty)", False, 
                        f"Status: {status_code}", data)
            return
        
        # Test POST - Create project
        project_data = {
            "name": "Test Project Alpha",
            "initial_plaster_area": 1000,
            "final_plastered_area": 950,
            "bags_used": 50,
            "invoiced_amount": 50000,
            "amount_received": 30000,
            "status": "Pending"
        }
        
        success, data, status_code = self.make_request('POST', '/projects', project_data)
        if success:
            project_id = data.get('id')
            if project_id:
                self.created_resources['projects'].append(project_id)
                
                # Verify auto-calculation of pending_amount
                expected_pending = project_data['invoiced_amount'] - project_data['amount_received']
                actual_pending = data.get('pending_amount')
                
                if actual_pending == expected_pending:
                    self.log_test("Projects API - POST (auto-calculation)", True, 
                                f"Pending amount correctly calculated: {actual_pending}")
                else:
                    self.log_test("Projects API - POST (auto-calculation)", False, 
                                f"Expected pending: {expected_pending}, Got: {actual_pending}")
                
                # Test PUT - Update project
                updated_data = project_data.copy()
                updated_data['amount_received'] = 40000
                
                success, update_response, status_code = self.make_request('PUT', f'/projects/{project_id}', updated_data)
                if success:
                    new_pending = update_response.get('pending_amount')
                    expected_new_pending = updated_data['invoiced_amount'] - updated_data['amount_received']
                    
                    if new_pending == expected_new_pending:
                        self.log_test("Projects API - PUT (update calculation)", True, 
                                    f"Updated pending amount: {new_pending}")
                    else:
                        self.log_test("Projects API - PUT (update calculation)", False, 
                                    f"Expected: {expected_new_pending}, Got: {new_pending}")
                else:
                    self.log_test("Projects API - PUT", False, 
                                f"Status: {status_code}", update_response)
                
            else:
                self.log_test("Projects API - POST (ID generation)", False, 
                            "No ID returned in response", data)
        else:
            self.log_test("Projects API - POST", False, 
                        f"Status: {status_code}", data)
        
        # Test GET projects (with data)
        success, data, status_code = self.make_request('GET', '/projects')
        if success:
            self.log_test("Projects API - GET (with data)", True, 
                        f"Retrieved {len(data)} projects")
        else:
            self.log_test("Projects API - GET (with data)", False, 
                        f"Status: {status_code}", data)
    
    def test_transactions_api(self):
        """Test Transactions CRUD operations and balance updates"""
        print("=== Testing Transactions API ===")
        
        # Get initial dashboard state
        success, initial_dashboard, _ = self.make_request('GET', '/dashboard')
        if not success:
            self.log_test("Transactions API - Initial Dashboard", False, 
                        "Could not get initial dashboard state")
            return
        
        initial_bank = initial_dashboard.get('bank_balance', 0)
        initial_petty = initial_dashboard.get('petty_cash_balance', 0)
        
        # Test POST - Create income transaction (Bank)
        income_transaction = {
            "date": "2025-01-15T10:00:00",
            "amount": 10000,
            "type": "Income",
            "mode": "Bank",
            "description": "Initial capital investment"
        }
        
        success, data, status_code = self.make_request('POST', '/transactions', income_transaction)
        if success:
            transaction_id = data.get('id')
            if transaction_id:
                self.created_resources['transactions'].append(transaction_id)
                self.log_test("Transactions API - POST Income (Bank)", True, 
                            f"Created transaction ID: {transaction_id}")
                
                # Verify balance update
                success, updated_dashboard, _ = self.make_request('GET', '/dashboard')
                if success:
                    new_bank = updated_dashboard.get('bank_balance', 0)
                    expected_bank = initial_bank + income_transaction['amount']
                    
                    if new_bank == expected_bank:
                        self.log_test("Transactions API - Bank Balance Update", True, 
                                    f"Bank balance updated: {initial_bank} → {new_bank}")
                    else:
                        self.log_test("Transactions API - Bank Balance Update", False, 
                                    f"Expected: {expected_bank}, Got: {new_bank}")
                else:
                    self.log_test("Transactions API - Balance Verification", False, 
                                "Could not verify balance update")
            else:
                self.log_test("Transactions API - POST Income (ID)", False, 
                            "No transaction ID returned")
        else:
            self.log_test("Transactions API - POST Income", False, 
                        f"Status: {status_code}", data)
        
        # Test POST - Create expense transaction (Petty Cash)
        expense_transaction = {
            "date": "2025-01-15T11:00:00",
            "amount": 5000,
            "type": "Expense",
            "mode": "Petty Cash",
            "category": "Bags",
            "description": "Bags purchase for project"
        }
        
        success, data, status_code = self.make_request('POST', '/transactions', expense_transaction)
        if success:
            transaction_id = data.get('id')
            if transaction_id:
                self.created_resources['transactions'].append(transaction_id)
                self.log_test("Transactions API - POST Expense (Petty Cash)", True, 
                            f"Created transaction ID: {transaction_id}")
                
                # Verify petty cash balance update
                success, updated_dashboard, _ = self.make_request('GET', '/dashboard')
                if success:
                    new_petty = updated_dashboard.get('petty_cash_balance', 0)
                    expected_petty = initial_petty - expense_transaction['amount']
                    
                    if new_petty == expected_petty:
                        self.log_test("Transactions API - Petty Cash Balance Update", True, 
                                    f"Petty cash updated: {initial_petty} → {new_petty}")
                    else:
                        self.log_test("Transactions API - Petty Cash Balance Update", False, 
                                    f"Expected: {expected_petty}, Got: {new_petty}")
            else:
                self.log_test("Transactions API - POST Expense (ID)", False, 
                            "No transaction ID returned")
        else:
            self.log_test("Transactions API - POST Expense", False, 
                        f"Status: {status_code}", data)
        
        # Test GET transactions
        success, data, status_code = self.make_request('GET', '/transactions')
        if success:
            self.log_test("Transactions API - GET", True, 
                        f"Retrieved {len(data)} transactions")
            
            # Test date filtering
            start_date = "2025-01-15T00:00:00"
            end_date = "2025-01-15T23:59:59"
            success, filtered_data, _ = self.make_request('GET', '/transactions', 
                                                        params={'start_date': start_date, 'end_date': end_date})
            if success:
                self.log_test("Transactions API - Date Filtering", True, 
                            f"Filtered to {len(filtered_data)} transactions")
            else:
                self.log_test("Transactions API - Date Filtering", False, 
                            "Date filtering failed")
        else:
            self.log_test("Transactions API - GET", False, 
                        f"Status: {status_code}", data)
    
    def test_inventory_api(self):
        """Test Inventory operations"""
        print("=== Testing Inventory API ===")
        
        # Test GET inventory (initial state)
        success, data, status_code = self.make_request('GET', '/inventory')
        if success:
            initial_stock = data.get('current_stock', 0)
            initial_purchased = data.get('total_bags_purchased', 0)
            self.log_test("Inventory API - GET (initial)", True, 
                        f"Current stock: {initial_stock}, Total purchased: {initial_purchased}")
        else:
            self.log_test("Inventory API - GET (initial)", False, 
                        f"Status: {status_code}", data)
            return
        
        # Test POST - Add bags purchase
        purchase_data = {
            "bags": 100,
            "amount": 5000,
            "date": "2025-01-15T12:00:00"
        }
        
        success, data, status_code = self.make_request('POST', '/inventory/purchase', purchase_data)
        if success:
            self.log_test("Inventory API - POST Purchase", True, 
                        "Bags purchase added successfully")
            
            # Verify inventory update
            success, updated_inventory, _ = self.make_request('GET', '/inventory')
            if success:
                new_purchased = updated_inventory.get('total_bags_purchased', 0)
                expected_purchased = initial_purchased + purchase_data['bags']
                
                if new_purchased == expected_purchased:
                    self.log_test("Inventory API - Purchase Update", True, 
                                f"Total purchased updated: {initial_purchased} → {new_purchased}")
                else:
                    self.log_test("Inventory API - Purchase Update", False, 
                                f"Expected: {expected_purchased}, Got: {new_purchased}")
                
                # Verify current stock calculation
                bags_used = updated_inventory.get('bags_used', 0)
                current_stock = updated_inventory.get('current_stock', 0)
                expected_stock = new_purchased - bags_used
                
                if current_stock == expected_stock:
                    self.log_test("Inventory API - Stock Calculation", True, 
                                f"Current stock correctly calculated: {current_stock}")
                else:
                    self.log_test("Inventory API - Stock Calculation", False, 
                                f"Expected: {expected_stock}, Got: {current_stock}")
            else:
                self.log_test("Inventory API - Verification", False, 
                            "Could not verify inventory update")
        else:
            self.log_test("Inventory API - POST Purchase", False, 
                        f"Status: {status_code}", data)
    
    def test_partners_api(self):
        """Test Partners CRUD operations and balance calculations"""
        print("=== Testing Partners API ===")
        
        # Test GET partners (initially empty)
        success, data, status_code = self.make_request('GET', '/partners')
        if success:
            self.log_test("Partners API - GET (empty)", True, 
                        f"Retrieved {len(data)} partners")
        else:
            self.log_test("Partners API - GET (empty)", False, 
                        f"Status: {status_code}", data)
            return
        
        # Test POST - Create partner
        partner_data = {
            "name": "Partner Alpha",
            "total_investment": 100000
        }
        
        success, data, status_code = self.make_request('POST', '/partners', partner_data)
        if success:
            partner_id = data.get('id')
            if partner_id:
                self.created_resources['partners'].append(partner_id)
                
                # Verify initial balance calculation
                current_balance = data.get('current_balance')
                expected_balance = partner_data['total_investment']
                
                if current_balance == expected_balance:
                    self.log_test("Partners API - POST (initial balance)", True, 
                                f"Initial balance correctly set: {current_balance}")
                else:
                    self.log_test("Partners API - POST (initial balance)", False, 
                                f"Expected: {expected_balance}, Got: {current_balance}")
                
                # Test partner investment transaction
                investment_data = {
                    "partner_id": partner_id,
                    "amount": 50000,
                    "type": "Investment"
                }
                
                success, invest_response, status_code = self.make_request('POST', '/partners/transaction', investment_data)
                if success:
                    self.log_test("Partners API - Investment Transaction", True, 
                                "Investment transaction added")
                    
                    # Verify balance update after investment
                    success, updated_partners, _ = self.make_request('GET', '/partners')
                    if success and updated_partners:
                        updated_partner = next((p for p in updated_partners if p['id'] == partner_id), None)
                        if updated_partner:
                            new_balance = updated_partner.get('current_balance')
                            expected_new_balance = expected_balance + investment_data['amount']
                            
                            if new_balance == expected_new_balance:
                                self.log_test("Partners API - Investment Balance Update", True, 
                                            f"Balance updated: {expected_balance} → {new_balance}")
                            else:
                                self.log_test("Partners API - Investment Balance Update", False, 
                                            f"Expected: {expected_new_balance}, Got: {new_balance}")
                        else:
                            self.log_test("Partners API - Partner Lookup", False, 
                                        "Could not find updated partner")
                else:
                    self.log_test("Partners API - Investment Transaction", False, 
                                f"Status: {status_code}", invest_response)
                
                # Test partner withdrawal transaction
                withdrawal_data = {
                    "partner_id": partner_id,
                    "amount": 20000,
                    "type": "Withdrawal"
                }
                
                success, withdraw_response, status_code = self.make_request('POST', '/partners/transaction', withdrawal_data)
                if success:
                    self.log_test("Partners API - Withdrawal Transaction", True, 
                                "Withdrawal transaction added")
                    
                    # Verify balance update after withdrawal
                    success, final_partners, _ = self.make_request('GET', '/partners')
                    if success and final_partners:
                        final_partner = next((p for p in final_partners if p['id'] == partner_id), None)
                        if final_partner:
                            final_balance = final_partner.get('current_balance')
                            # Expected: initial (100000) + investment (50000) - withdrawal (20000) = 130000
                            expected_final_balance = 100000 + 50000 - 20000
                            
                            if final_balance == expected_final_balance:
                                self.log_test("Partners API - Withdrawal Balance Update", True, 
                                            f"Final balance correct: {final_balance}")
                            else:
                                self.log_test("Partners API - Withdrawal Balance Update", False, 
                                            f"Expected: {expected_final_balance}, Got: {final_balance}")
                        else:
                            self.log_test("Partners API - Final Partner Lookup", False, 
                                        "Could not find partner for final verification")
                else:
                    self.log_test("Partners API - Withdrawal Transaction", False, 
                                f"Status: {status_code}", withdraw_response)
            else:
                self.log_test("Partners API - POST (ID generation)", False, 
                            "No partner ID returned")
        else:
            self.log_test("Partners API - POST", False, 
                        f"Status: {status_code}", data)
    
    def test_export_api(self):
        """Test Export functionality"""
        print("=== Testing Export API ===")
        
        # Test CSV export
        try:
            url = f"{self.base_url}/export/transactions?format=csv"
            response = self.session.get(url)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'text/csv' in content_type:
                    content = response.text
                    lines = content.split('\n')
                    if len(lines) > 1 and 'Date,Type,Mode,Category,Amount,Description' in lines[0]:
                        self.log_test("Export API - CSV Format", True, 
                                    f"CSV export successful, {len(lines)-1} data rows")
                    else:
                        self.log_test("Export API - CSV Headers", False, 
                                    f"Invalid CSV format. First line: {lines[0] if lines else 'Empty'}")
                else:
                    self.log_test("Export API - Content Type", False, 
                                f"Expected text/csv, got: {content_type}")
            else:
                self.log_test("Export API - HTTP Status", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Export API - Request", False, 
                        f"Exception: {str(e)}")
    
    def test_error_handling(self):
        """Test error handling for invalid data"""
        print("=== Testing Error Handling ===")
        
        # Test invalid project data
        invalid_project = {
            "name": "",  # Empty name
            "initial_plaster_area": -100,  # Negative value
            "final_plastered_area": 950,
            "bags_used": 50,
            "invoiced_amount": 50000,
            "amount_received": 30000
        }
        
        success, data, status_code = self.make_request('POST', '/projects', invalid_project)
        if not success and status_code in [400, 422]:
            self.log_test("Error Handling - Invalid Project Data", True, 
                        f"Correctly rejected invalid data (Status: {status_code})")
        else:
            self.log_test("Error Handling - Invalid Project Data", False, 
                        f"Should have rejected invalid data. Status: {status_code}")
        
        # Test non-existent resource
        success, data, status_code = self.make_request('GET', '/projects/nonexistent-id')
        if not success and status_code in [404, 400]:
            self.log_test("Error Handling - Non-existent Resource", True, 
                        f"Correctly returned error for non-existent resource (Status: {status_code})")
        else:
            self.log_test("Error Handling - Non-existent Resource", False, 
                        f"Should have returned 404. Status: {status_code}")
        
        # Test invalid transaction data
        invalid_transaction = {
            "date": "invalid-date",
            "amount": -1000,  # Negative amount
            "type": "InvalidType",
            "mode": "InvalidMode"
        }
        
        success, data, status_code = self.make_request('POST', '/transactions', invalid_transaction)
        if not success and status_code in [400, 422]:
            self.log_test("Error Handling - Invalid Transaction Data", True, 
                        f"Correctly rejected invalid transaction (Status: {status_code})")
        else:
            self.log_test("Error Handling - Invalid Transaction Data", False, 
                        f"Should have rejected invalid transaction. Status: {status_code}")
    
    def cleanup_test_data(self):
        """Clean up created test data"""
        print("=== Cleaning Up Test Data ===")
        
        # Delete created projects
        for project_id in self.created_resources['projects']:
            success, _, _ = self.make_request('DELETE', f'/projects/{project_id}')
            if success:
                print(f"✅ Deleted project: {project_id}")
            else:
                print(f"❌ Failed to delete project: {project_id}")
        
        # Delete created transactions
        for transaction_id in self.created_resources['transactions']:
            success, _, _ = self.make_request('DELETE', f'/transactions/{transaction_id}')
            if success:
                print(f"✅ Deleted transaction: {transaction_id}")
            else:
                print(f"❌ Failed to delete transaction: {transaction_id}")
        
        # Delete created partners
        for partner_id in self.created_resources['partners']:
            success, _, _ = self.make_request('DELETE', f'/partners/{partner_id}')
            if success:
                print(f"✅ Deleted partner: {partner_id}")
            else:
                print(f"❌ Failed to delete partner: {partner_id}")
        
        print()
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting Backend API Tests for: {self.base_url}")
        print("=" * 80)
        
        # Run all test suites
        self.test_dashboard_api()
        self.test_projects_api()
        self.test_transactions_api()
        self.test_inventory_api()
        self.test_partners_api()
        self.test_export_api()
        self.test_error_handling()
        
        # Clean up test data
        self.cleanup_test_data()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['message']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"  • {result['test']}")
        
        print("\n" + "=" * 80)
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()