# Aruvi Housing Solutions - Finance Tracking App

## Overview
Mobile app for Aruvi Housing Solutions to track finances, inventory, and projects for their plastering business.

## Tech Stack
- **Frontend:** Expo (React Native) with Expo Router, bottom tab navigation
- **Backend:** FastAPI (Python) with Motor (MongoDB async driver)
- **Database:** MongoDB

## Core Modules

### 1. Dashboard
- Total balance (Bank + Petty Cash)
- Receivables, Expenses, Profit/Loss metrics
- Stock breakdown by bag type (Naturoplast & Iraniya)
- Expandable Balance Sheet (Assets vs Liabilities)
- Expandable Bank Account section with transaction list
- Monthly income/expense breakdown

### 2. Projects
- CRUD operations for projects
- Fields: name, plaster area (initial/final), invoiced amount, received amount, auto-calculated pending
- **Bag Usage Tracking**: Add bag usage entries with date, bag type (Naturoplast/Iraniya), quantity
- **Linked Transactions**: View all income/expense transactions linked to a project
- Status: Pending / Completed

### 3. Transactions
- Unified income/expense transaction system
- **Project Linking**: Dropdown to tag transactions to projects
- Mode: Bank / Petty Cash / Partner
- Categories (expenses): Bags, Labor, Transport, Materials, Rent, Electricity, Food, Misc
- Auto-updates bank/petty cash balances
- CSV export functionality

### 4. Inventory (Bags)
- Two bag types: **Naturoplast** and **Iraniya** (tracked separately)
- Per-type stock count, purchased, and used metrics
- Purchase history with bag type and payment mode
- Bags deducted automatically from project usage

### 5. Partners
- Partner CRUD with investment/withdrawal tracking
- **Date field** on all partner transactions
- **Bank impact**: Investments ADD to bank, Withdrawals DEDUCT from bank
- Creates corresponding bank transaction entries
- Expandable transaction history per partner

## Currency
All amounts in ₹ (INR)

## API Endpoints
- `GET /api/dashboard` - All metrics including balance sheet data
- `GET/POST /api/projects` - Project CRUD
- `GET /api/projects/{id}` - Project detail with linked transactions
- `POST /api/projects/{id}/bag-usage` - Add bag usage
- `GET/POST /api/transactions` - Transaction CRUD with filtering
- `GET /api/inventory` - Inventory with per-type breakdown
- `POST /api/inventory/purchase` - Add bag purchase
- `GET/POST /api/partners` - Partner CRUD
- `POST /api/partners/transaction` - Partner investment/withdrawal
- `GET /api/export/transactions` - CSV export
