# Aruvi Housing Solutions - Finance Tracking App

## Overview
Mobile app for Aruvi Housing Solutions to track finances, inventory, and projects for their plastering business.

## Tech Stack
- **Frontend:** Expo (React Native) with Expo Router, bottom tab navigation
- **Backend:** FastAPI (Python) with Motor (MongoDB async driver)
- **Database:** MongoDB
- **Auth:** JWT Bearer token (single company login)
- **Backup:** Google Drive API with OAuth2

## Authentication
- Single company login: `aruvihousingsolutions@gmail.com`
- JWT token stored in AsyncStorage, sent as Bearer header
- 30-day token expiry
- All API routes protected

## Core Modules

### 1. Dashboard
- Total balance (Bank + Petty Cash), Receivables, Expenses, Profit/Loss
- Stock breakdown by bag type (Naturoplast & Iraniya)
- Expandable Balance Sheet (Assets vs Liabilities)
- Expandable Bank Account section with transaction list
- Monthly income/expense breakdown
- Google Drive backup controls (Connect/Backup Now/Disconnect)
- Sign Out button

### 2. Projects
- CRUD operations with bag usage tracking (date, type, quantity)
- Linked transactions view in project detail
- Status: Pending / Completed

### 3. Transactions
- Unified income/expense with project linking dropdown
- Mode: Bank / Petty Cash / Partner
- Categories for expenses, CSV export

### 4. Inventory (Bags)
- Two bag types: Naturoplast and Iraniya (tracked separately)
- Purchase history with payment mode
- Auto-deduction from project usage

### 5. Partners
- Investment/withdrawal tracking with date
- Bank balance impact (investments ADD, withdrawals DEDUCT)
- Transaction history per partner

## Google Drive Backup
- OAuth2 flow to connect company Google Drive
- Creates `Aruvi Housing Solutions - Backup` folder
- Exports all collections as JSON files in dated subfolders
- Manual backup via dashboard button
- Auto-backup every 24 hours when connected

## API Endpoints
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `GET /api/dashboard` - All metrics
- CRUD: `/api/projects`, `/api/transactions`, `/api/partners`, `/api/inventory`
- `GET /api/drive/connect` - Initiate Google Drive OAuth
- `GET /api/oauth/drive/callback` - OAuth callback
- `POST /api/drive/backup` - Manual backup
- `GET /api/drive/status` - Drive connection status
- `GET /api/export/transactions` - CSV export
