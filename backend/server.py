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
from datetime import datetime, timezone
from bson import ObjectId
import io
import csv


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ========== MODELS ==========

BAG_TYPES = ["Naturoplast", "Iraniya"]

class ProjectCreate(BaseModel):
    name: str
    initial_plaster_area: float
    final_plastered_area: float
    bag_usage_history: List[dict] = []
    invoiced_amount: float
    amount_received: float
    status: str = "Pending"

class BagUsageEntry(BaseModel):
    project_id: str
    date: str
    bag_type: str
    quantity: int

class TransactionCreate(BaseModel):
    date: str
    amount: float
    type: str
    mode: str
    linked_project_id: Optional[str] = None
    linked_project_name: Optional[str] = None
    category: Optional[str] = None
    description: str = ""

class PartnerCreate(BaseModel):
    name: str
    total_investment: float = 0

class PartnerTransaction(BaseModel):
    partner_id: str
    amount: float
    type: str
    date: str

class InventoryPurchase(BaseModel):
    bags: int
    bag_type: str
    amount: float
    date: str
    mode: str = "Bank"


# ========== HELPERS ==========

def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

async def get_settings():
    settings = await db.settings.find_one()
    if not settings:
        settings = {"bank_balance": 0, "petty_cash_balance": 0}
        await db.settings.insert_one(settings)
    return serialize_doc(settings)

async def update_balance_field(field: str, amount: float):
    await db.settings.update_one({}, {"$inc": {field: amount}}, upsert=True)


# ========== DASHBOARD ==========

@api_router.get("/dashboard")
async def get_dashboard():
    try:
        settings = await get_settings()
        bank_bal = settings.get("bank_balance", 0)
        petty_bal = settings.get("petty_cash_balance", 0)

        projects = await db.projects.find().to_list(1000)
        total_receivables = sum(p.get("pending_amount", 0) for p in projects)

        all_transactions = await db.transactions.find().to_list(10000)
        total_income = sum(t["amount"] for t in all_transactions if t.get("type") == "Income")
        total_expenses = sum(t["amount"] for t in all_transactions if t.get("type") == "Expense")

        # Inventory per bag type
        inv = await db.inventory.find_one() or {}
        naturoplast_purchased = inv.get("naturoplast_purchased", 0)
        iraniya_purchased = inv.get("iraniya_purchased", 0)

        naturoplast_used = 0
        iraniya_used = 0
        for p in projects:
            for entry in p.get("bag_usage_history", []):
                if entry.get("bag_type") == "Naturoplast":
                    naturoplast_used += entry.get("quantity", 0)
                elif entry.get("bag_type") == "Iraniya":
                    iraniya_used += entry.get("quantity", 0)

        naturoplast_stock = naturoplast_purchased - naturoplast_used
        iraniya_stock = iraniya_purchased - iraniya_used
        total_stock = naturoplast_stock + iraniya_stock

        # Partner total liabilities
        partners = await db.partners.find().to_list(1000)
        total_partner_balance = sum(p.get("current_balance", 0) for p in partners)

        # Monthly breakdown for reports
        monthly = {}
        for t in all_transactions:
            dt = t.get("date")
            if isinstance(dt, str):
                dt = datetime.fromisoformat(dt)
            key = dt.strftime("%Y-%m") if dt else "unknown"
            if key not in monthly:
                monthly[key] = {"income": 0, "expense": 0}
            if t["type"] == "Income":
                monthly[key]["income"] += t["amount"]
            else:
                monthly[key]["expense"] += t["amount"]

        # Bank transactions
        bank_transactions = [serialize_doc(dict(t)) for t in all_transactions if t.get("mode") == "Bank"]
        for bt in bank_transactions:
            if "_id" in bt:
                del bt["_id"]

        return {
            "total_balance": bank_bal + petty_bal,
            "bank_balance": bank_bal,
            "petty_cash_balance": petty_bal,
            "total_receivables": total_receivables,
            "total_income": total_income,
            "total_expenses": total_expenses,
            "profit_loss": total_income - total_expenses,
            "total_stock": total_stock,
            "naturoplast_stock": naturoplast_stock,
            "iraniya_stock": iraniya_stock,
            "naturoplast_purchased": naturoplast_purchased,
            "iraniya_purchased": iraniya_purchased,
            "naturoplast_used": naturoplast_used,
            "iraniya_used": iraniya_used,
            "total_partner_balance": total_partner_balance,
            "monthly_breakdown": monthly,
            "bank_transactions": bank_transactions,
        }
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== PROJECTS ==========

@api_router.get("/projects")
async def get_projects():
    try:
        projects = await db.projects.find().to_list(1000)
        return [serialize_doc(p) for p in projects]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/projects/{project_id}")
async def get_project_detail(project_id: str):
    """Get project detail with linked transactions"""
    try:
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        project = serialize_doc(project)
        # Get linked transactions
        linked_txns = await db.transactions.find({"linked_project_id": project_id}).sort("date", -1).to_list(1000)
        project["linked_transactions"] = [serialize_doc(t) for t in linked_txns]
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/projects")
async def create_project(project: ProjectCreate):
    try:
        d = project.dict()
        bags_used = sum(e.get("quantity", 0) for e in d.get("bag_usage_history", []))
        d["bags_used"] = bags_used
        d["pending_amount"] = d["invoiced_amount"] - d["amount_received"]
        d["created_at"] = datetime.now(timezone.utc)
        d["updated_at"] = datetime.now(timezone.utc)
        result = await db.projects.insert_one(d)
        created = await db.projects.find_one({"_id": result.inserted_id})
        return serialize_doc(created)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, project: ProjectCreate):
    try:
        d = project.dict()
        bags_used = sum(e.get("quantity", 0) for e in d.get("bag_usage_history", []))
        d["bags_used"] = bags_used
        d["pending_amount"] = d["invoiced_amount"] - d["amount_received"]
        d["updated_at"] = datetime.now(timezone.utc)
        result = await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": d})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        updated = await db.projects.find_one({"_id": ObjectId(project_id)})
        return serialize_doc(updated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/projects/{project_id}/bag-usage")
async def add_bag_usage(project_id: str, entry: BagUsageEntry):
    """Add bag usage entry to a project"""
    try:
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        usage_entry = {"date": entry.date, "bag_type": entry.bag_type, "quantity": entry.quantity}
        await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$push": {"bag_usage_history": usage_entry}, "$inc": {"bags_used": entry.quantity}}
        )
        updated = await db.projects.find_one({"_id": ObjectId(project_id)})
        return serialize_doc(updated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    try:
        result = await db.projects.delete_one({"_id": ObjectId(project_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"message": "Project deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== TRANSACTIONS ==========

@api_router.get("/transactions")
async def get_transactions(start_date: Optional[str] = None, end_date: Optional[str] = None, mode: Optional[str] = None):
    try:
        query = {}
        if start_date and end_date:
            query["date"] = {"$gte": start_date, "$lte": end_date}
        if mode:
            query["mode"] = mode
        transactions = await db.transactions.find(query).sort("date", -1).to_list(10000)
        return [serialize_doc(t) for t in transactions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/transactions")
async def create_transaction(transaction: TransactionCreate):
    try:
        d = transaction.dict()
        d["created_at"] = datetime.now(timezone.utc)
        # Resolve project name if linked
        if d.get("linked_project_id") and not d.get("linked_project_name"):
            proj = await db.projects.find_one({"_id": ObjectId(d["linked_project_id"])})
            if proj:
                d["linked_project_name"] = proj.get("name", "")
        result = await db.transactions.insert_one(d)
        # Update balances
        if d["mode"] == "Bank":
            amt = d["amount"] if d["type"] == "Income" else -d["amount"]
            await update_balance_field("bank_balance", amt)
        elif d["mode"] == "Petty Cash":
            amt = d["amount"] if d["type"] == "Income" else -d["amount"]
            await update_balance_field("petty_cash_balance", amt)
        created = await db.transactions.find_one({"_id": result.inserted_id})
        return serialize_doc(created)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: str, transaction: TransactionCreate):
    try:
        old = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
        if not old:
            raise HTTPException(status_code=404, detail="Transaction not found")
        # Reverse old effect
        if old["mode"] == "Bank":
            rev = -old["amount"] if old["type"] == "Income" else old["amount"]
            await update_balance_field("bank_balance", rev)
        elif old["mode"] == "Petty Cash":
            rev = -old["amount"] if old["type"] == "Income" else old["amount"]
            await update_balance_field("petty_cash_balance", rev)

        d = transaction.dict()
        if d.get("linked_project_id") and not d.get("linked_project_name"):
            proj = await db.projects.find_one({"_id": ObjectId(d["linked_project_id"])})
            if proj:
                d["linked_project_name"] = proj.get("name", "")
        await db.transactions.update_one({"_id": ObjectId(transaction_id)}, {"$set": d})
        # Apply new effect
        if d["mode"] == "Bank":
            amt = d["amount"] if d["type"] == "Income" else -d["amount"]
            await update_balance_field("bank_balance", amt)
        elif d["mode"] == "Petty Cash":
            amt = d["amount"] if d["type"] == "Income" else -d["amount"]
            await update_balance_field("petty_cash_balance", amt)
        updated = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
        return serialize_doc(updated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    try:
        txn = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn["mode"] == "Bank":
            rev = -txn["amount"] if txn["type"] == "Income" else txn["amount"]
            await update_balance_field("bank_balance", rev)
        elif txn["mode"] == "Petty Cash":
            rev = -txn["amount"] if txn["type"] == "Income" else txn["amount"]
            await update_balance_field("petty_cash_balance", rev)
        await db.transactions.delete_one({"_id": ObjectId(transaction_id)})
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== INVENTORY ==========

@api_router.get("/inventory")
async def get_inventory():
    try:
        inv = await db.inventory.find_one()
        if not inv:
            inv = {"naturoplast_purchased": 0, "iraniya_purchased": 0}
            await db.inventory.insert_one(inv)

        projects = await db.projects.find().to_list(1000)
        naturoplast_used = 0
        iraniya_used = 0
        for p in projects:
            for e in p.get("bag_usage_history", []):
                if e.get("bag_type") == "Naturoplast":
                    naturoplast_used += e.get("quantity", 0)
                elif e.get("bag_type") == "Iraniya":
                    iraniya_used += e.get("quantity", 0)

        inv = serialize_doc(inv)
        np = inv.get("naturoplast_purchased", 0)
        ip = inv.get("iraniya_purchased", 0)
        inv["naturoplast_purchased"] = np
        inv["iraniya_purchased"] = ip
        inv["naturoplast_used"] = naturoplast_used
        inv["iraniya_used"] = iraniya_used
        inv["naturoplast_stock"] = np - naturoplast_used
        inv["iraniya_stock"] = ip - iraniya_used
        inv["total_purchased"] = np + ip
        inv["total_used"] = naturoplast_used + iraniya_used
        inv["current_stock"] = (np + ip) - (naturoplast_used + iraniya_used)

        # Get purchase history
        purchases = await db.inventory_purchases.find().sort("date", -1).to_list(1000)
        inv["purchase_history"] = [serialize_doc(p) for p in purchases]

        return inv
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/inventory/purchase")
async def add_inventory_purchase(purchase: InventoryPurchase):
    try:
        field = "naturoplast_purchased" if purchase.bag_type == "Naturoplast" else "iraniya_purchased"
        await db.inventory.update_one({}, {"$inc": {field: purchase.bags}}, upsert=True)

        # Save purchase record
        record = {
            "bags": purchase.bags, "bag_type": purchase.bag_type,
            "amount": purchase.amount, "date": purchase.date,
            "mode": purchase.mode, "created_at": datetime.now(timezone.utc)
        }
        await db.inventory_purchases.insert_one(record)

        # Create expense transaction
        txn = TransactionCreate(
            date=purchase.date, amount=purchase.amount,
            type="Expense", mode=purchase.mode, category="Bags",
            description=f"Purchase of {purchase.bags} {purchase.bag_type} bags"
        )
        await create_transaction(txn)
        return {"message": "Purchase added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== PARTNERS ==========

@api_router.get("/partners")
async def get_partners():
    try:
        partners = await db.partners.find().to_list(1000)
        result = []
        for p in partners:
            p = serialize_doc(p)
            # Get partner transaction history
            txn_history = await db.partner_transactions.find({"partner_id": p["id"]}).sort("date", -1).to_list(1000)
            p["transaction_history"] = [serialize_doc(t) for t in txn_history]
            result.append(p)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/partners")
async def create_partner(partner: PartnerCreate):
    try:
        d = partner.dict()
        d["total_withdrawals"] = 0
        d["current_balance"] = d["total_investment"]
        d["created_at"] = datetime.now(timezone.utc)
        d["updated_at"] = datetime.now(timezone.utc)
        result = await db.partners.insert_one(d)
        created = await db.partners.find_one({"_id": result.inserted_id})
        return serialize_doc(created)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, partner: PartnerCreate):
    try:
        existing = await db.partners.find_one({"_id": ObjectId(partner_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Partner not found")
        d = partner.dict()
        d["current_balance"] = d["total_investment"] - existing.get("total_withdrawals", 0)
        d["updated_at"] = datetime.now(timezone.utc)
        await db.partners.update_one({"_id": ObjectId(partner_id)}, {"$set": d})
        updated = await db.partners.find_one({"_id": ObjectId(partner_id)})
        return serialize_doc(updated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str):
    try:
        result = await db.partners.delete_one({"_id": ObjectId(partner_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Partner not found")
        return {"message": "Partner deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/partners/transaction")
async def partner_transaction(transaction: PartnerTransaction):
    """Partner investment/withdrawal - affects bank balance"""
    try:
        partner = await db.partners.find_one({"_id": ObjectId(transaction.partner_id)})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        partner_name = partner.get("name", "Partner")

        if transaction.type == "Investment":
            await db.partners.update_one(
                {"_id": ObjectId(transaction.partner_id)},
                {"$inc": {"total_investment": transaction.amount, "current_balance": transaction.amount},
                 "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
            # Create bank transaction entry (this also updates bank balance)
            txn = TransactionCreate(
                date=transaction.date, amount=transaction.amount,
                type="Income", mode="Bank", category=None,
                description=f"Investment from {partner_name}"
            )
            await create_transaction(txn)
        elif transaction.type == "Withdrawal":
            await db.partners.update_one(
                {"_id": ObjectId(transaction.partner_id)},
                {"$inc": {"total_withdrawals": transaction.amount, "current_balance": -transaction.amount},
                 "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
            # Create bank transaction entry (this also updates bank balance)
            txn = TransactionCreate(
                date=transaction.date, amount=transaction.amount,
                type="Expense", mode="Bank", category=None,
                description=f"Withdrawal by {partner_name}"
            )
            await create_transaction(txn)

        # Save partner transaction record
        record = {
            "partner_id": transaction.partner_id, "partner_name": partner_name,
            "amount": transaction.amount, "type": transaction.type,
            "date": transaction.date, "created_at": datetime.now(timezone.utc)
        }
        await db.partner_transactions.insert_one(record)

        return {"message": "Transaction added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== EXPORT ==========

@api_router.get("/export/transactions")
async def export_transactions(format: str = "csv", start_date: Optional[str] = None, end_date: Optional[str] = None):
    try:
        query = {}
        if start_date and end_date:
            query["date"] = {"$gte": start_date, "$lte": end_date}
        transactions = await db.transactions.find(query).sort("date", -1).to_list(10000)

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["Date", "Type", "Mode", "Category", "Amount", "Description", "Project"])
        writer.writeheader()
        for t in transactions:
            dt = t.get("date", "")
            if isinstance(dt, datetime):
                dt = dt.strftime("%Y-%m-%d")
            writer.writerow({
                "Date": dt, "Type": t["type"], "Mode": t["mode"],
                "Category": t.get("category", ""), "Amount": t["amount"],
                "Description": t.get("description", ""),
                "Project": t.get("linked_project_name", "")
            })
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]), media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=transactions.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Include router & middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
