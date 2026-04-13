from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import io
import csv


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ========== MODELS ==========

class Project(BaseModel):
    id: Optional[str] = None
    name: str
    initial_plaster_area: float
    final_plastered_area: float
    bags_used: int
    invoiced_amount: float
    amount_received: float
    pending_amount: float = 0
    status: str = "Pending"  # Pending or Completed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectCreate(BaseModel):
    name: str
    initial_plaster_area: float
    final_plastered_area: float
    bags_used: int
    invoiced_amount: float
    amount_received: float
    status: str = "Pending"

class Transaction(BaseModel):
    id: Optional[str] = None
    date: datetime
    amount: float
    type: str  # Income or Expense
    mode: str  # Bank, Petty Cash, Partner
    linked_project_id: Optional[str] = None
    category: Optional[str] = None  # For expenses only
    description: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(BaseModel):
    date: datetime
    amount: float
    type: str
    mode: str
    linked_project_id: Optional[str] = None
    category: Optional[str] = None
    description: str = ""

class Partner(BaseModel):
    id: Optional[str] = None
    name: str
    total_investment: float = 0
    total_withdrawals: float = 0
    current_balance: float = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PartnerCreate(BaseModel):
    name: str
    total_investment: float = 0

class PartnerTransaction(BaseModel):
    partner_id: str
    amount: float
    type: str  # Investment or Withdrawal

class InventoryPurchase(BaseModel):
    bags: int
    amount: float
    date: datetime

class Settings(BaseModel):
    bank_balance: float = 0
    petty_cash_balance: float = 0


# ========== HELPER FUNCTIONS ==========

def serialize_doc(doc):
    """Convert MongoDB document to dict with string ID"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

async def get_settings():
    """Get or create settings"""
    settings = await db.settings.find_one()
    if not settings:
        settings = {"bank_balance": 0, "petty_cash_balance": 0}
        await db.settings.insert_one(settings)
    return serialize_doc(settings)

async def update_balances(transaction_type: str, mode: str, amount: float):
    """Update balances based on transaction"""
    settings = await get_settings()
    
    if transaction_type == "Income":
        if mode == "Bank":
            await db.settings.update_one({}, {"$inc": {"bank_balance": amount}}, upsert=True)
        elif mode == "Petty Cash":
            await db.settings.update_one({}, {"$inc": {"petty_cash_balance": amount}}, upsert=True)
    elif transaction_type == "Expense":
        if mode == "Bank":
            await db.settings.update_one({}, {"$inc": {"bank_balance": -amount}}, upsert=True)
        elif mode == "Petty Cash":
            await db.settings.update_one({}, {"$inc": {"petty_cash_balance": -amount}}, upsert=True)


# ========== DASHBOARD ==========

@api_router.get("/dashboard")
async def get_dashboard():
    """Get dashboard statistics"""
    try:
        # Get settings for balances
        settings = await get_settings()
        total_balance = settings.get("bank_balance", 0) + settings.get("petty_cash_balance", 0)
        
        # Calculate total receivables (pending amounts from projects)
        projects = await db.projects.find().to_list(1000)
        total_receivables = sum(p.get("pending_amount", 0) for p in projects)
        
        # Calculate total expenses
        expenses = await db.transactions.find({"type": "Expense"}).to_list(10000)
        total_expenses = sum(e.get("amount", 0) for e in expenses)
        
        # Calculate total stock
        inventory = await db.inventory.find_one()
        if not inventory:
            inventory = {"total_bags_purchased": 0, "bags_used": 0}
            await db.inventory.insert_one(inventory)
        
        bags_used_in_projects = sum(p.get("bags_used", 0) for p in projects)
        await db.inventory.update_one({}, {"$set": {"bags_used": bags_used_in_projects}}, upsert=True)
        
        total_stock = inventory.get("total_bags_purchased", 0) - bags_used_in_projects
        
        return {
            "total_balance": total_balance,
            "bank_balance": settings.get("bank_balance", 0),
            "petty_cash_balance": settings.get("petty_cash_balance", 0),
            "total_receivables": total_receivables,
            "total_expenses": total_expenses,
            "total_stock": total_stock
        }
    except Exception as e:
        logger.error(f"Error getting dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== PROJECTS ==========

@api_router.get("/projects")
async def get_projects():
    """Get all projects"""
    try:
        projects = await db.projects.find().to_list(1000)
        return [serialize_doc(p) for p in projects]
    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/projects")
async def create_project(project: ProjectCreate):
    """Create a new project"""
    try:
        project_dict = project.dict()
        project_dict["pending_amount"] = project_dict["invoiced_amount"] - project_dict["amount_received"]
        project_dict["created_at"] = datetime.utcnow()
        project_dict["updated_at"] = datetime.utcnow()
        
        result = await db.projects.insert_one(project_dict)
        
        # Get the created project and serialize it properly
        created_project = await db.projects.find_one({"_id": result.inserted_id})
        return serialize_doc(created_project)
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, project: ProjectCreate):
    """Update a project"""
    try:
        project_dict = project.dict()
        project_dict["pending_amount"] = project_dict["invoiced_amount"] - project_dict["amount_received"]
        project_dict["updated_at"] = datetime.utcnow()
        
        result = await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": project_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_dict["id"] = project_id
        return project_dict
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    try:
        result = await db.projects.delete_one({"_id": ObjectId(project_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"message": "Project deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== TRANSACTIONS ==========

@api_router.get("/transactions")
async def get_transactions(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get all transactions with optional date filtering"""
    try:
        query = {}
        if start_date and end_date:
            query["date"] = {
                "$gte": datetime.fromisoformat(start_date),
                "$lte": datetime.fromisoformat(end_date)
            }
        
        transactions = await db.transactions.find(query).sort("date", -1).to_list(10000)
        return [serialize_doc(t) for t in transactions]
    except Exception as e:
        logger.error(f"Error getting transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/transactions")
async def create_transaction(transaction: TransactionCreate):
    """Create a new transaction and update balances"""
    try:
        transaction_dict = transaction.dict()
        transaction_dict["created_at"] = datetime.utcnow()
        
        result = await db.transactions.insert_one(transaction_dict)
        
        # Update balances if mode is not Partner
        if transaction_dict["mode"] != "Partner":
            await update_balances(
                transaction_dict["type"],
                transaction_dict["mode"],
                transaction_dict["amount"]
            )
        
        # Get the created transaction and serialize it properly
        created_transaction = await db.transactions.find_one({"_id": result.inserted_id})
        return serialize_doc(created_transaction)
    except Exception as e:
        logger.error(f"Error creating transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: str, transaction: TransactionCreate):
    """Update a transaction"""
    try:
        # Get old transaction to reverse its effect on balances
        old_transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
        if not old_transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Reverse old transaction effect
        if old_transaction["mode"] != "Partner":
            reverse_type = "Expense" if old_transaction["type"] == "Income" else "Income"
            await update_balances(
                reverse_type,
                old_transaction["mode"],
                old_transaction["amount"]
            )
        
        # Update transaction
        transaction_dict = transaction.dict()
        result = await db.transactions.update_one(
            {"_id": ObjectId(transaction_id)},
            {"$set": transaction_dict}
        )
        
        # Apply new transaction effect
        if transaction_dict["mode"] != "Partner":
            await update_balances(
                transaction_dict["type"],
                transaction_dict["mode"],
                transaction_dict["amount"]
            )
        
        transaction_dict["id"] = transaction_id
        return transaction_dict
    except Exception as e:
        logger.error(f"Error updating transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    """Delete a transaction"""
    try:
        # Get transaction to reverse its effect
        transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Reverse transaction effect
        if transaction["mode"] != "Partner":
            reverse_type = "Expense" if transaction["type"] == "Income" else "Income"
            await update_balances(
                reverse_type,
                transaction["mode"],
                transaction["amount"]
            )
        
        result = await db.transactions.delete_one({"_id": ObjectId(transaction_id)})
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== INVENTORY ==========

@api_router.get("/inventory")
async def get_inventory():
    """Get current inventory"""
    try:
        inventory = await db.inventory.find_one()
        if not inventory:
            inventory = {"total_bags_purchased": 0, "bags_used": 0}
            await db.inventory.insert_one(inventory)
        
        # Calculate bags used from projects
        projects = await db.projects.find().to_list(1000)
        bags_used = sum(p.get("bags_used", 0) for p in projects)
        
        await db.inventory.update_one({}, {"$set": {"bags_used": bags_used}}, upsert=True)
        
        inventory = serialize_doc(inventory)
        inventory["bags_used"] = bags_used
        inventory["current_stock"] = inventory.get("total_bags_purchased", 0) - bags_used
        
        return inventory
    except Exception as e:
        logger.error(f"Error getting inventory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/inventory/purchase")
async def add_inventory_purchase(purchase: InventoryPurchase):
    """Add bags purchase to inventory"""
    try:
        # Update inventory
        await db.inventory.update_one(
            {},
            {"$inc": {"total_bags_purchased": purchase.bags}},
            upsert=True
        )
        
        # Create expense transaction
        transaction = TransactionCreate(
            date=purchase.date,
            amount=purchase.amount,
            type="Expense",
            mode="Bank",
            category="Bags",
            description=f"Purchase of {purchase.bags} bags"
        )
        await create_transaction(transaction)
        
        return {"message": "Purchase added successfully"}
    except Exception as e:
        logger.error(f"Error adding purchase: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== PARTNERS ==========

@api_router.get("/partners")
async def get_partners():
    """Get all partners"""
    try:
        partners = await db.partners.find().to_list(1000)
        return [serialize_doc(p) for p in partners]
    except Exception as e:
        logger.error(f"Error getting partners: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/partners")
async def create_partner(partner: PartnerCreate):
    """Create a new partner"""
    try:
        partner_dict = partner.dict()
        partner_dict["total_withdrawals"] = 0
        partner_dict["current_balance"] = partner_dict["total_investment"]
        partner_dict["created_at"] = datetime.utcnow()
        partner_dict["updated_at"] = datetime.utcnow()
        
        result = await db.partners.insert_one(partner_dict)
        
        # Get the created partner and serialize it properly
        created_partner = await db.partners.find_one({"_id": result.inserted_id})
        return serialize_doc(created_partner)
    except Exception as e:
        logger.error(f"Error creating partner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, partner: PartnerCreate):
    """Update a partner"""
    try:
        existing_partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
        if not existing_partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        partner_dict = partner.dict()
        partner_dict["current_balance"] = partner_dict["total_investment"] - existing_partner.get("total_withdrawals", 0)
        partner_dict["updated_at"] = datetime.utcnow()
        
        await db.partners.update_one(
            {"_id": ObjectId(partner_id)},
            {"$set": partner_dict}
        )
        
        partner_dict["id"] = partner_id
        partner_dict["total_withdrawals"] = existing_partner.get("total_withdrawals", 0)
        return partner_dict
    except Exception as e:
        logger.error(f"Error updating partner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str):
    """Delete a partner"""
    try:
        result = await db.partners.delete_one({"_id": ObjectId(partner_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Partner not found")
        return {"message": "Partner deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting partner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/partners/transaction")
async def partner_transaction(transaction: PartnerTransaction):
    """Add investment or withdrawal for a partner"""
    try:
        partner = await db.partners.find_one({"_id": ObjectId(transaction.partner_id)})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        if transaction.type == "Investment":
            await db.partners.update_one(
                {"_id": ObjectId(transaction.partner_id)},
                {
                    "$inc": {
                        "total_investment": transaction.amount,
                        "current_balance": transaction.amount
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        elif transaction.type == "Withdrawal":
            await db.partners.update_one(
                {"_id": ObjectId(transaction.partner_id)},
                {
                    "$inc": {
                        "total_withdrawals": transaction.amount,
                        "current_balance": -transaction.amount
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        
        return {"message": "Transaction added successfully"}
    except Exception as e:
        logger.error(f"Error adding partner transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== EXPORT ==========

@api_router.get("/export/transactions")
async def export_transactions(format: str = "csv", start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Export transactions as CSV"""
    try:
        query = {}
        if start_date and end_date:
            query["date"] = {
                "$gte": datetime.fromisoformat(start_date),
                "$lte": datetime.fromisoformat(end_date)
            }
        
        transactions = await db.transactions.find(query).sort("date", -1).to_list(10000)
        
        if format == "csv":
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=["Date", "Type", "Mode", "Category", "Amount", "Description"])
            writer.writeheader()
            
            for t in transactions:
                writer.writerow({
                    "Date": t["date"].strftime("%Y-%m-%d"),
                    "Type": t["type"],
                    "Mode": t["mode"],
                    "Category": t.get("category", ""),
                    "Amount": t["amount"],
                    "Description": t.get("description", "")
                })
            
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=transactions.csv"}
            )
    except Exception as e:
        logger.error(f"Error exporting transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
