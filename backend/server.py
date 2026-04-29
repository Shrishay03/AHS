from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, HTMLResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

import os
import io
import csv
import json
import asyncio
import tempfile
import logging

from openpyxl import Workbook
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

import bcrypt
import jwt

# Google Drive
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest


# ======================================================
# ENV / DB
# ======================================================

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ======================================================
# HELPERS
# ======================================================

def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str, email: str):
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request):
    auth = request.headers.get("Authorization", "")

    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth[7:]

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", "")
        }

    except:
        raise HTTPException(status_code=401, detail="Invalid token")


# ======================================================
# MODELS
# ======================================================

class LoginRequest(BaseModel):
    email: str
    password: str


class TransactionCreate(BaseModel):
    date: str
    amount: float
    type: str
    mode: str
    category: Optional[str] = None
    description: Optional[str] = ""


# ======================================================
# SETTINGS
# ======================================================

async def get_settings():
    s = await db.settings.find_one()

    if not s:
        await db.settings.insert_one({
            "bank_balance": 0,
            "petty_cash_balance": 0
        })
        s = await db.settings.find_one()

    return s


async def update_balance(field: str, amount: float):
    await db.settings.update_one({}, {"$inc": {field: amount}}, upsert=True)


# ======================================================
# AUTH
# ======================================================

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower().strip()})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid login")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid login")

    token = create_access_token(str(user["_id"]), user["email"])

    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", "")
        }
    }


@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return user


# ======================================================
# DASHBOARD
# ======================================================

@api_router.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    settings = await get_settings()

    txns = await db.transactions.find().to_list(10000)

    income = sum(t["amount"] for t in txns if t["type"] == "Income")
    expense = sum(t["amount"] for t in txns if t["type"] == "Expense")

    return {
        "bank_balance": settings.get("bank_balance", 0),
        "petty_cash_balance": settings.get("petty_cash_balance", 0),
        "total_balance":
            settings.get("bank_balance", 0)
            + settings.get("petty_cash_balance", 0),

        "total_income": income,
        "total_expenses": expense,
        "profit_loss": income - expense,

        "drive_connected":
            await db.drive_credentials.find_one({"user_id": user["id"]})
            is not None
    }


# ======================================================
# TRANSACTIONS
# ======================================================

@api_router.get("/transactions")
async def transactions(user=Depends(get_current_user)):
    txns = await db.transactions.find().sort("date", -1).to_list(10000)
    return [serialize_doc(t) for t in txns]


@api_router.post("/transactions")
async def add_transaction(
    data: TransactionCreate,
    user=Depends(get_current_user)
):
    d = data.dict()
    d["created_at"] = datetime.now(timezone.utc)

    result = await db.transactions.insert_one(d)

    if d["mode"] == "Bank":
        await update_balance(
            "bank_balance",
            d["amount"] if d["type"] == "Income" else -d["amount"]
        )

    elif d["mode"] == "Petty Cash":
        await update_balance(
            "petty_cash_balance",
            d["amount"] if d["type"] == "Income" else -d["amount"]
        )

    created = await db.transactions.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


# ======================================================
# EXPORT CSV
# ======================================================

@api_router.get("/export/transactions")
async def export_transactions(user=Depends(get_current_user)):
    txns = await db.transactions.find().sort("date", -1).to_list(10000)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        ["Date", "Type", "Mode", "Category", "Amount", "Description"]
    )

    for t in txns:
        writer.writerow([
            t.get("date", ""),
            t.get("type", ""),
            t.get("mode", ""),
            t.get("category", ""),
            t.get("amount", 0),
            t.get("description", "")
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                "attachment; filename=transactions.csv"
        }
    )


# ======================================================
# GOOGLE DRIVE
# ======================================================

def get_drive_flow():
    redirect_uri = os.environ["GOOGLE_DRIVE_REDIRECT_URI"]

    client_config = {
        "web": {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }

    return Flow.from_client_config(
        client_config,
        scopes=["https://www.googleapis.com/auth/drive.file"],
        redirect_uri=redirect_uri
    )


async def get_drive_service_for_user(user_id: str):
    creds_doc = await db.drive_credentials.find_one({"user_id": user_id})

    if not creds_doc:
        return None

    creds = Credentials(
        token=creds_doc["access_token"],
        refresh_token=creds_doc.get("refresh_token"),
        token_uri=creds_doc["token_uri"],
        client_id=creds_doc["client_id"],
        client_secret=creds_doc["client_secret"],
        scopes=creds_doc["scopes"]
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())

        await db.drive_credentials.update_one(
            {"user_id": user_id},
            {"$set": {"access_token": creds.token}}
        )

    return build("drive", "v3", credentials=creds)


@api_router.get("/drive/connect")
async def drive_connect(user=Depends(get_current_user)):
    flow = get_drive_flow()

    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true"
    )

    await db.oauth_temp.delete_many({"user_id": user["id"]})

    await db.oauth_temp.insert_one({
        "user_id": user["id"],
        "state": state,
        "code_verifier": flow.code_verifier
    })

    return {"authorization_url": auth_url}


@api_router.get("/oauth/drive/callback")
async def drive_callback(code: str, state: str = ""):
    try:
        saved = await db.oauth_temp.find_one({"state": state})

        if not saved:
            return HTMLResponse("<h2>Connection Failed</h2>")

        flow = get_drive_flow()
        flow.code_verifier = saved["code_verifier"]

        flow.fetch_token(code=code)

        creds = flow.credentials

        await db.drive_credentials.update_one(
            {"user_id": saved["user_id"]},
            {
                "$set": {
                    "user_id": saved["user_id"],
                    "access_token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "token_uri": creds.token_uri,
                    "client_id": creds.client_id,
                    "client_secret": creds.client_secret,
                    "scopes": list(creds.scopes)
                }
            },
            upsert=True
        )

        await db.oauth_temp.delete_many({"state": state})

        return HTMLResponse("""
        <html>
        <body>
        <h2>Google Drive Connected</h2>
        <script>window.close();</script>
        </body>
        </html>
        """)

    except Exception as e:
        return HTMLResponse(f"<h2>Connection Failed</h2><p>{str(e)}</p>")


# ======================================================
# BACKUP ONLY (.xlsx)
# ======================================================

async def run_drive_backup(user_id: str):
    service = await get_drive_service_for_user(user_id)

    if not service:
        raise HTTPException(status_code=400, detail="Drive not connected")

    folder_name = "Aruvi Housing Solutions - Backup"

    query = (
        f"name='{folder_name}' and "
        "mimeType='application/vnd.google-apps.folder' "
        "and trashed=false"
    )

    folders = service.files().list(
        q=query,
        spaces="drive",
        fields="files(id,name)"
    ).execute().get("files", [])

    if folders:
        folder_id = folders[0]["id"]
    else:
        created = service.files().create(
            body={
                "name": folder_name,
                "mimeType": "application/vnd.google-apps.folder"
            },
            fields="id"
        ).execute()

        folder_id = created["id"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Transactions"

    txns = await db.transactions.find().to_list(10000)

    ws.append([
        "Date", "Type", "Mode", "Category", "Amount", "Description"
    ])

    for t in txns:
        ws.append([
            t.get("date", ""),
            t.get("type", ""),
            t.get("mode", ""),
            t.get("category", ""),
            t.get("amount", 0),
            t.get("description", "")
        ])

    filename = datetime.now().strftime(
        "AHS_Backup_%d-%m-%Y_%H-%M.xlsx"
    )

    with tempfile.NamedTemporaryFile(
        suffix=".xlsx",
        delete=False
    ) as tmp:

        wb.save(tmp.name)

        media = MediaFileUpload(
            tmp.name,
            mimetype=(
                "application/vnd.openxmlformats-"
                "officedocument.spreadsheetml.sheet"
            )
        )

        service.files().create(
            body={
                "name": filename,
                "parents": [folder_id]
            },
            media_body=media
        ).execute()

    await db.backup_log.insert_one({
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc),
        "file": filename
    })

    return {
        "message": "Backup completed",
        "file": filename
    }


@api_router.post("/drive/backup")
async def backup(user=Depends(get_current_user)):
    return await run_drive_backup(user["id"])


@api_router.get("/drive/disconnect")
async def disconnect(user=Depends(get_current_user)):
    await db.drive_credentials.delete_many({"user_id": user["id"]})
    return {"message": "Disconnected"}


# ======================================================
# STARTUP
# ======================================================

@app.on_event("startup")
async def startup():
    email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    password = os.environ.get("ADMIN_PASSWORD", "admin123")

    existing = await db.users.find_one({"email": email})

    if not existing:
        await db.users.insert_one({
            "email": email,
            "password_hash": hash_password(password),
            "name": "Aruvi Housing Solutions",
            "role": "admin"
        })

    await db.users.create_index("email", unique=True)

    asyncio.create_task(auto_backup_scheduler())


async def auto_backup_scheduler():
    while True:
        await asyncio.sleep(86400)

        try:
            admin = await db.users.find_one({"role": "admin"})

            if admin:
                creds = await db.drive_credentials.find_one({
                    "user_id": str(admin["_id"])
                })

                if creds:
                    await run_drive_backup(str(admin["_id"]))

        except Exception as e:
            logger.error(e)


# ======================================================
# APP
# ======================================================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
