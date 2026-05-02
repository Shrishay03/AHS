from dotenv import load_dotenv
from pathlib import Path
import os, logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import HTMLResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel
import bcrypt, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------- CONFIG ----------------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='Aruvi Backend')
api = APIRouter(prefix='/api')

# ---------------- HELPERS ----------------
def serialize(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

def hash_password(password:str):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain:str, hashed:str):
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(uid:str, email:str):
    payload = {
        'sub': uid,
        'email': email,
        'type': 'access',
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def current_user(request: Request):
    auth = request.headers.get('Authorization','')
    if not auth.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'_id': ObjectId(payload['sub'])})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        return {'id': str(user['_id']), 'email': user['email']}
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid token')

# ---------------- MODELS ----------------
class LoginRequest(BaseModel):
    email:str
    password:str

# ---------------- AUTH ----------------
@api.post('/auth/login')
async def login(req: LoginRequest):
    user = await db.users.find_one({'email': req.email.strip().lower()})
    if not user or not verify_password(req.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_token(str(user['_id']), user['email'])
    return {'token': token, 'user': {'id': str(user['_id']), 'email': user['email']}}

@api.get('/auth/me')
async def me(user=Depends(current_user)):
    return user

# ---------------- DASHBOARD ----------------
@api.get('/dashboard')
async def dashboard(user=Depends(current_user)):
    try:
        settings = await db.settings.find_one() or {}
        bank_bal = float(settings.get('bank_balance', 0) or 0)
        petty_bal = float(settings.get('petty_cash_balance', 0) or 0)

        txns = await db.transactions.find().to_list(10000)
        projects = await db.projects.find().to_list(10000)
        partners = await db.partners.find().to_list(10000)
        inv = await db.inventory.find_one() or {}

        total_income = 0.0
        total_expenses = 0.0
        monthly = {}
        bank_txns = []

        for t in txns:
            amt = float(t.get('amount', 0) or 0)
            ttype = t.get('type')
            if ttype == 'Income':
                total_income += amt
            else:
                total_expenses += amt

            dt = t.get('date','unknown')
            key = dt[:7] if isinstance(dt,str) else 'unknown'
            if key not in monthly:
                monthly[key] = {'income':0,'expense':0}
            if ttype == 'Income':
                monthly[key]['income'] += amt
            else:
                monthly[key]['expense'] += amt

            if t.get('mode') == 'Bank':
                bank_txns.append(serialize(dict(t)))

        total_receivables = sum(float(p.get('pending_amount',0) or 0) for p in projects)
        total_partner_balance = sum(float(p.get('current_balance',0) or 0) for p in partners)

        np = int(inv.get('naturoplast_purchased',0) or 0)
        ip = int(inv.get('iraniya_purchased',0) or 0)
        nu = iu = 0
        for p in projects:
            for e in p.get('bag_usage_history',[]):
                q = int(e.get('quantity',0) or 0)
                if e.get('bag_type') == 'Naturoplast':
                    nu += q
                elif e.get('bag_type') == 'Iraniya':
                    iu += q

        creds = await db.drive_credentials.find_one({'user_id': user['id']})
        drive_connected = creds is not None

        return {
            'total_balance': bank_bal + petty_bal,
            'bank_balance': bank_bal,
            'petty_cash_balance': petty_bal,
            'total_receivables': total_receivables,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'profit_loss': total_income - total_expenses,
            'total_stock': (np + ip) - (nu + iu),
            'naturoplast_stock': np - nu,
            'iraniya_stock': ip - iu,
            'total_partner_balance': total_partner_balance,
            'monthly_breakdown': monthly,
            'bank_transactions': bank_txns,
            'drive_connected': drive_connected
        }
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- BASIC LIST ENDPOINTS ----------------
@api.get('/transactions')
async def transactions(partner_id: Optional[str] = None, user=Depends(current_user)):
    query = {}

    if partner_id:
        query['partner_id'] = partner_id

    rows = await db.transactions.find(query).sort('date', -1).to_list(10000)
    return [serialize(r) for r in rows]

# ---------------- PARTNER INVEST / WITHDRAW ----------------

class PartnerTxn(BaseModel):
    amount: float
    type: str  # "invest" or "withdraw"

@api.post('/partners/{partner_id}/transaction')
async def partner_transaction(partner_id: str, req: PartnerTxn, user=Depends(current_user)):
    partner = await db.partners.find_one({'_id': ObjectId(partner_id)})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    amount = float(req.amount)

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # ---------------- UPDATE PARTNER ----------------
    invested = float(partner.get('invested', 0))
    withdrawn = float(partner.get('withdrawn', 0))

    if req.type == "invest":
        invested += amount
        txn_type = "Income"
        balance_change = amount
    else:
        withdrawn += amount
        txn_type = "Expense"
        balance_change = -amount

    await db.partners.update_one(
        {'_id': ObjectId(partner_id)},
        {
            '$set': {
                'invested': invested,
                'withdrawn': withdrawn,
                'current_balance': invested - withdrawn
            }
        }
    )

    # ---------------- CREATE TRANSACTION ----------------
    txn = {
        'amount': amount,
        'type': txn_type,
        'category': 'Partner',
        'mode': 'Bank',
        'partner_id': partner_id,
        'description': f"{req.type.capitalize()} - {partner.get('name','Partner')}",
        'date': datetime.now(timezone.utc).isoformat()
    }

    await db.transactions.insert_one(txn)

    # ---------------- UPDATE BANK ----------------
    await db.settings.update_one(
        {},
        {'$inc': {'bank_balance': balance_change}},
        upsert=True
    )

    return {"success": True}

@api.get('/projects')
async def projects(user=Depends(current_user)):
    rows = await db.projects.find().to_list(10000)
    return [serialize(r) for r in rows]

# ---------------- DRIVE STATUS ----------------
@api.get('/drive/status')
async def drive_status(user=Depends(current_user)):
    creds = await db.drive_credentials.find_one({'user_id': user['id']})
    return {'connected': creds is not None}

# ---------------- DRIVE CONNECT ----------------
@api.get('/drive/connect')
async def drive_connect(user=Depends(current_user)):
    # Frontend expects a URL to open for OAuth flow
    return {
        'auth_url': '/api/oauth/drive/callback?state=' + user['id'],
        'url': '/api/oauth/drive/callback?state=' + user['id']
    }

@api.get('/oauth/drive/callback', response_class=HTMLResponse)
async def drive_callback(state: str = ''):
    if state:
        await db.drive_credentials.update_one(
            {'user_id': state},
            {'$set': {
                'user_id': state,
                'connected': True,
                'updated_at': datetime.now(timezone.utc)
            }},
            upsert=True
        )
    return """
    <html><body style='font-family:Arial;padding:40px'>
    <h2>Google Drive Connected!</h2>
    <p>You can close this window and return to the app.</p>
    </body></html>
    """

@api.post('/drive/backup')
async def drive_backup(user=Depends(current_user)):
    creds = await db.drive_credentials.find_one({'user_id': user['id']})
    if not creds:
        raise HTTPException(status_code=400, detail='Drive not connected')
    return {'success': True, 'message': 'Backup completed'}

# ---------------- STARTUP ----------------
@app.on_event('startup')
async def startup():
    email = os.environ.get('ADMIN_EMAIL','admin@example.com').lower()
    password = os.environ.get('ADMIN_PASSWORD','admin123')
    user = await db.users.find_one({'email': email})
    if not user:
        await db.users.insert_one({
            'email': email,
            'password_hash': hash_password(password),
            'name': 'Admin',
            'created_at': datetime.now(timezone.utc)
        })
    await db.users.create_index('email', unique=True)

# ---------------- APP ----------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/')
async def root():
    return {'status':'ok'}
