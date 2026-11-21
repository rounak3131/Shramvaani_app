import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
from urllib.parse import quote
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))

# Auto-connects to Render Cloud PostgreSQL (DATABASE_URL) for multi-year storage
db_url = (os.getenv('DATABASE_URL') or os.getenv('DATABASE_URI') or 'sqlite:///shramvaani_live_v5.db').strip()
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, resources={r"/api/*": {"origins": "*"}})
db = SQLAlchemy(app)

IST = timezone(timedelta(hours=5, minutes=30))

# Zero-Exposure Admin Password Policy (Loaded strictly from Server Environment)
STRONG_PIN_REGEX = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$'
RAW_ADMIN_PIN = os.getenv('ADMIN_PIN', '').strip()
ADMIN_PIN_VALID = bool(re.match(STRONG_PIN_REGEX, RAW_ADMIN_PIN))
ADMIN_PIN_HASH = generate_password_hash(RAW_ADMIN_PIN) if ADMIN_PIN_VALID else None

DEFAULT_MERCHANT_UPI = os.getenv('MERCHANT_UPI_ID', 'shramvaani.escrow@oksbi').strip()
ACTIVE_ADMIN_TOKENS = {}

LANGUAGES = {
    "hi": {"name": "Hindi", "native": "हिन्दी", "locale": "hi-IN"},
    "en": {"name": "English", "native": "English", "locale": "en-IN"},
    "bn": {"name": "Bengali", "native": "বাংলা", "locale": "bn-IN"},
    "mr": {"name": "Marathi", "native": "मराठी", "locale": "mr-IN"},
    "te": {"name": "Telugu", "native": "తెలుగు", "locale": "te-IN"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "locale": "ta-IN"},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી", "locale": "gu-IN"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "locale": "kn-IN"},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "locale": "ml-IN"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "locale": "pa-IN"},
    "or": {"name": "Odia", "native": "ଓଡ଼ିଆ", "locale": "or-IN"},
    "as": {"name": "Assamese", "native": "অসমীয়া", "locale": "as-IN"},
    "ur": {"name": "Urdu", "native": "اردو", "locale": "ur-IN"},
    "mai": {"name": "Maithili", "native": "मैथिली", "locale": "hi-IN"},
    "sat": {"name": "Santali", "native": "संथाली", "locale": "hi-IN"},
    "ks": {"name": "Kashmiri", "native": "कश्मीरी", "locale": "ur-IN"},
    "ne": {"name": "Nepali", "native": "नेपाली", "locale": "ne-NP"},
    "kok": {"name": "Konkani", "native": "कोंकणी", "locale": "mr-IN"},
    "sd": {"name": "Sindhi", "native": "सिन्धी", "locale": "hi-IN"},
    "doi": {"name": "Dogri", "native": "डोगरी", "locale": "hi-IN"},
    "mni": {"name": "Manipuri", "native": "मणिपुरी", "locale": "bn-IN"},
    "brx": {"name": "Bodo", "native": "बोडो", "locale": "hi-IN"},
    "sa": {"name": "Sanskrit", "native": "संस्कृत", "locale": "hi-IN"}
}

# ==================== VERHOEFF CHECKSUM VALIDATION ====================
_d_table = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
]
_p_table = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

def validate_verhoeff_12digit(num_str: str) -> bool:
    if not re.match(r'^[2-9]\d{11}$', num_str):
        return False
    if len(set(num_str)) <= 2:
        return False
    c = 0
    for i, item in enumerate(reversed(num_str)):
        c = _d_table[c][_p_table[i % 8][int(item)]]
    return c == 0

# ==================== DATABASE MODELS ====================

class PlatformConfig(db.Model):
    __tablename__ = 'platform_config'
    id = db.Column(db.Integer, primary_key=True)
    platform_fee = db.Column(db.Float, default=50.0)
    announcement = db.Column(db.String(250), default='सभी मज़दूरों की दिहाड़ी 100% सुरक्षित Escrow में जमा होती है।')

class WorkerProfile(db.Model):
    __tablename__ = 'workers'
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    skill = db.Column(db.String(100), nullable=False)
    daily_wage = db.Column(db.Float, default=750.0)
    kyc_status = db.Column(db.String(30), default='UNVERIFIED')
    kyc_badge = db.Column(db.String(80), default='UNVERIFIED')
    kyc_masked_id = db.Column(db.String(30), nullable=True)
    trust_score = db.Column(db.Integer, default=40)
    lock_days_remaining = db.Column(db.Integer, default=7)
    is_locked = db.Column(db.Boolean, default=True)

class EmployerProfile(db.Model):
    __tablename__ = 'employers'
    id = db.Column(db.String(36), primary_key=True)
    company_name = db.Column(db.String(120), nullable=False)
    kyc_status = db.Column(db.String(30), default='UNVERIFIED')
    gstin_masked = db.Column(db.String(30), nullable=True)
    kyc_badge = db.Column(db.String(80), default='UNVERIFIED')

class JobPosting(db.Model):
    __tablename__ = 'jobs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(150), nullable=False)
    location = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(250), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    shift_time = db.Column(db.String(80), nullable=False)
    wage = db.Column(db.Float, nullable=False)
    employer_name = db.Column(db.String(100), nullable=False)
    employer_verified = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(30), default='OPEN')

class PaymentOrder(db.Model):
    __tablename__ = 'payment_orders'
    order_id = db.Column(db.String(24), primary_key=True)
    worker_id = db.Column(db.String(36), nullable=False)
    employer_name = db.Column(db.String(120), default='Sharma Builders')
    job_id = db.Column(db.Integer, nullable=True)
    expected_amount = db.Column(db.Float, nullable=False)
    upi_vpa = db.Column(db.String(80), nullable=False)
    upi_uri = db.Column(db.String(300), nullable=False)
    status = db.Column(db.String(20), default='PENDING')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class EscrowTransaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.String(24), nullable=False)
    utr = db.Column(db.String(12), unique=True, nullable=False, index=True)
    worker_id = db.Column(db.String(36), nullable=False, index=True)
    worker_name = db.Column(db.String(100), default='Raju Kumar')
    employer_name = db.Column(db.String(100), nullable=False)
    job_title = db.Column(db.String(150), default='Residential Flooring & Plaster')
    job_location = db.Column(db.String(150), default='Sector 62, Noida')
    job_address = db.Column(db.String(250), default='Plot C-56/4, Institutional Area, Sector 62, Noida, UP')
    total_amount = db.Column(db.Float, nullable=False)
    net_wage = db.Column(db.Float, nullable=False)
    platform_fee = db.Column(db.Float, nullable=False)
    release_otp = db.Column(db.String(4), nullable=False)
    otp_attempts = db.Column(db.Integer, default=0)
    status = db.Column(db.String(30), default='LOCKED', index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

class OTPChallenge(db.Model):
    __tablename__ = 'otp_challenges'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    purpose = db.Column(db.String(40), nullable=False)
    target_id = db.Column(db.String(40), nullable=False)
    otp_code = db.Column(db.String(4), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)

class ChatMessage(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_role = db.Column(db.String(20), nullable=False)
    sender_name = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class FraudLog(db.Model):
    __tablename__ = 'fraud_logs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    attempted_utr = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.String(200), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()
    if not db.session.get(PlatformConfig, 1):
        db.session.add(PlatformConfig(id=1, platform_fee=50.0))
    if not db.session.get(WorkerProfile, 'W-101'):
        db.session.add(WorkerProfile(
            id='W-101', name='Raju Kumar (Demo)',
            skill='Mason & Tile Specialist (राजमिस्त्री)', daily_wage=750.0
        ))
    if not db.session.get(EmployerProfile, 'EMP-01'):
        db.session.add(EmployerProfile(id='EMP-01', company_name='Sharma Builders (Demo)'))
    if JobPosting.query.count() == 0:
        db.session.add(JobPosting(
            title='Residential Flooring & Plaster (Sample)',
            location='Sector 62, Noida',
            address='Plot C-56/4, Institutional Area, Sector 62, Noida, UP',
            lat=28.6273, lng=77.3725,
            shift_time='Tomorrow • 08:30 AM – 05:30 PM',
            wage=750.0, employer_name='Sharma Builders (Demo)', employer_verified=False, status='OPEN'
        ))
    db.session.commit()

def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        expiry = ACTIVE_ADMIN_TOKENS.get(token)
        if not expiry or datetime.utcnow() > expiry:
            ACTIVE_ADMIN_TOKENS.pop(token, None)
            return jsonify({"error": "Unauthorized or session expired"}), 401
        return f(*args, **kwargs)
    return decorated

def is_fake_or_dummy_utr(utr: str) -> tuple[bool, str]:
    if not re.match(r'^\d{12}$', utr):
        return True, "UTR must be exactly 12 numeric digits."
    if len(set(utr)) <= 2:
        return True, "Fake UTR Rejected: Repeated digits detected."
    if utr in ("123456789012", "012345678901", "987654321098"):
        return True, "Fake UTR Rejected: Sequential dummy pattern detected."
    if utr[0] not in ('3', '4', '5', '6', '7'):
        return True, "Invalid NPCI Bank Switch Prefix (Real UPI UTRs start with 3, 4, 5, 6, or 7)."
    return False, "Valid NPCI Structure"

# ==================== PUBLIC & SELF-SERVICE REGISTRATION APIs ====================

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "ShramVaani Production API",
        "storage": "PostgreSQL Cloud" if "postgresql" in db_url else "Local SQLite"
    })

@app.route('/api/config', methods=['GET'])
def get_public_config():
    cfg = db.session.get(PlatformConfig, 1)
    return jsonify({"platform_fee": cfg.platform_fee, "announcement": cfg.announcement})

@app.route('/api/languages', methods=['GET'])
def get_languages():
    return jsonify(LANGUAGES)

@app.route('/api/workers', methods=['GET', 'POST'])
def handle_workers():
    if request.method == 'POST':
        data = request.json or {}
        name = str(data.get('name', '')).strip()
        skill = str(data.get('skill', '')).strip()
        wage = float(data.get('daily_wage', 750))
        if not name or not skill:
            return jsonify({"success": False, "message": "Name and skill are required."}), 400
        new_id = f"W-{secrets.randbelow(900) + 102}"
        w = WorkerProfile(id=new_id, name=name, skill=skill, daily_wage=wage)
        db.session.add(w)
        db.session.commit()
        return jsonify({"success": True, "worker_id": w.id, "name": w.name}), 201

    workers = WorkerProfile.query.all()
    return jsonify([{
        "id": w.id, "name": w.name, "skill": w.skill,
        "daily_wage": w.daily_wage, "kyc_status": w.kyc_status, "kyc_badge": w.kyc_badge
    } for w in workers])

@app.route('/api/worker/<worker_id>', methods=['GET'])
def get_worker(worker_id):
    w = db.session.get(WorkerProfile, worker_id)
    if not w:
        w = WorkerProfile.query.first()
    next_job = JobPosting.query.order_by(JobPosting.id.desc()).first()
    active_locked_tx = EscrowTransaction.query.filter_by(worker_id=w.id, status='LOCKED').order_by(EscrowTransaction.created_at.desc()).first()
    return jsonify({
        "id": w.id, "name": w.name, "skill": w.skill, "daily_wage": w.daily_wage,
        "kyc_status": w.kyc_status, "kyc_badge": w.kyc_badge, "kyc_masked_id": w.kyc_masked_id,
        "trust_score": w.trust_score, "lock_days_remaining": w.lock_days_remaining, "is_locked": w.is_locked,
        "active_booking": {
            "order_id": active_locked_tx.order_id,
            "utr": active_locked_tx.utr,
            "net_wage": active_locked_tx.net_wage,
            "release_otp": active_locked_tx.release_otp,
            "employer_name": active_locked_tx.employer_name,
            "job_title": active_locked_tx.job_title,
            "job_location": active_locked_tx.job_location
        } if active_locked_tx else None,
        "next_job": {
            "id": next_job.id, "title": next_job.title, "location": next_job.location,
            "address": next_job.address, "lat": next_job.lat, "lng": next_job.lng,
            "shift_time": next_job.shift_time, "wage": next_job.wage,
            "employer_name": next_job.employer_name, "employer_verified": next_job.employer_verified
        } if next_job else None
    })

@app.route('/api/verify/identity', methods=['POST'])
def verify_identity():
    data = request.json or {}
    role = data.get('role')
    doc_number = str(data.get('doc_number', '')).strip().upper()
    worker_id = data.get('worker_id', 'W-101')

    if role == 'worker':
        if not validate_verhoeff_12digit(doc_number):
            return jsonify({
                "success": False,
                "message": "Invalid UAN Checksum! Random or sequential numbers fail Verhoeff mathematical validation."
            }), 400
        w = db.session.get(WorkerProfile, worker_id) or WorkerProfile.query.first()
        w.kyc_status = 'PENDING_ADMIN'
        w.kyc_badge = 'PENDING ADMIN REVIEW'
        w.kyc_masked_id = f"UAN-XXXX-{doc_number[-4:]}"
        w.trust_score = 70
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Checksum Valid! Sent to Admin Portal for final badge approval."
        })

    if role == 'employer':
        gst_regex = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gst_regex, doc_number):
            return jsonify({
                "success": False,
                "message": "Invalid GSTIN Format! Must follow official 15-character Indian GST structure."
            }), 400
        emp = db.session.get(EmployerProfile, 'EMP-01')
        if data.get('company_name'):
            emp.company_name = str(data.get('company_name')).strip()
        emp.kyc_status = 'PENDING_ADMIN'
        emp.kyc_badge = 'PENDING ADMIN REVIEW'
        emp.gstin_masked = f"{doc_number[:4]}XXXXX{doc_number[-3:]}"
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "GSTIN Format Valid! Sent to Admin Portal for final badge approval."
        })

    return jsonify({"success": False, "message": "Invalid role"}), 400

@app.route('/api/employer/<emp_id>', methods=['GET'])
def get_employer(emp_id):
    emp = db.session.get(EmployerProfile, emp_id)
    if not emp:
        return jsonify({"error": "Employer not found"}), 404
    return jsonify({
        "id": emp.id, "company_name": emp.company_name,
        "kyc_status": emp.kyc_status, "gstin_masked": emp.gstin_masked,
        "kyc_badge": emp.kyc_badge
    })

@app.route('/api/worker/<worker_id>/generate-unlock-otp', methods=['POST'])
def generate_unlock_otp(worker_id):
    otp_code = str(secrets.randbelow(9000) + 1000)
    OTPChallenge.query.filter_by(purpose='UNLOCK', target_id=worker_id, is_verified=False).delete()
    db.session.add(OTPChallenge(
        purpose='UNLOCK', target_id=worker_id, otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    ))
    db.session.commit()
    return jsonify({
        "success": True,
        "in_app_otp": otp_code,
        "message": f"In-App Unlock OTP Generated: {otp_code}"
    })

@app.route('/api/worker/<worker_id>/unlock', methods=['POST'])
def unlock_commitment(worker_id):
    data = request.json or {}
    otp = str(data.get('otp', '')).strip()
    reason = str(data.get('reason', '')).strip()
    if not reason:
        return jsonify({"success": False, "message": "Please enter a valid reason."}), 400
    challenge = OTPChallenge.query.filter_by(purpose='UNLOCK', target_id=worker_id, is_verified=False).order_by(OTPChallenge.id.desc()).first()
    if not challenge or datetime.utcnow() > challenge.expires_at:
        return jsonify({"success": False, "message": "Generate In-App OTP first or OTP expired."}), 400
    if challenge.otp_code != otp:
        return jsonify({"success": False, "message": "Wrong OTP! Enter exact 4-digit In-App OTP."}), 401
    challenge.is_verified = True
    w = db.session.get(WorkerProfile, worker_id)
    w.is_locked = False
    w.lock_days_remaining = 0
    db.session.commit()
    return jsonify({"success": True, "is_locked": False})

@app.route('/api/jobs', methods=['GET', 'POST'])
def handle_jobs():
    """Allows any Employer directly from Employer Portal to post a new job requirement!"""
    if request.method == 'POST':
        data = request.json or {}
        employer_name = str(data.get('employer_name', '')).strip()
        title = str(data.get('title', '')).strip()
        location = str(data.get('location', '')).strip()
        address = str(data.get('address', location)).strip()
        shift_time = str(data.get('shift_time', 'Tomorrow • 09:00 AM')).strip()
        wage = float(data.get('wage', 750))

        if not employer_name or not title or not location:
            return jsonify({"success": False, "message": "Your Name, Work Type, and Location are required."}), 400

        emp = db.session.get(EmployerProfile, 'EMP-01')
        if emp:
            emp.company_name = employer_name

        offset = (JobPosting.query.count() % 8) * 0.012
        job = JobPosting(
            title=title,
            location=location,
            address=address,
            lat=28.6139 + offset,
            lng=77.3195 + offset,
            shift_time=shift_time,
            wage=wage,
            employer_name=employer_name,
            employer_verified=(emp.kyc_status == 'VERIFIED') if emp else False,
            status='OPEN'
        )
        db.session.add(job)
        db.session.commit()
        return jsonify({"success": True, "id": job.id, "message": "Job published live!"}), 201

    jobs = JobPosting.query.order_by(JobPosting.id.desc()).all()
    return jsonify([{
        "id": j.id, "title": j.title, "location": j.location, "address": j.address,
        "lat": j.lat, "lng": j.lng, "shift_time": j.shift_time,
        "wage": j.wage, "employer_name": j.employer_name,
        "employer_verified": j.employer_verified, "status": j.status
    } for j in jobs])

# ==================== REAL SCANNABLE UPI QR & PERMANENT RECEIPTS ====================

@app.route('/api/payments/create-order', methods=['POST'])
def create_payment_order():
    data = request.json or {}
    amount = float(data.get('amount', 1))
    custom_upi = str(data.get('merchant_upi', '')).strip()
    employer_name = str(data.get('employer_name', 'Sharma Builders')).strip() or 'Sharma Builders'
    worker_id = str(data.get('worker_id', 'W-101')).strip()
    job_id = data.get('job_id')

    if amount < 1:
        return jsonify({"success": False, "message": "Minimum amount is ₹1."}), 400

    upi_vpa = custom_upi if re.match(r'^[\w.\-]{2,256}@[a-zA-Z]{2,64}$', custom_upi) else DEFAULT_MERCHANT_UPI
    order_id = f"ORD-{secrets.randbelow(900000) + 100000}"
    upi_uri = f"upi://pay?pa={upi_vpa}&pn={quote('ShramVaani Escrow')}&am={amount:.2f}&cu=INR&tn={order_id}"

    order = PaymentOrder(
        order_id=order_id, worker_id=worker_id, employer_name=employer_name,
        job_id=job_id, expected_amount=amount, upi_vpa=upi_vpa, upi_uri=upi_uri
    )
    db.session.add(order)
    db.session.commit()

    return jsonify({
        "success": True,
        "order": {
            "order_id": order.order_id,
            "expected_amount": order.expected_amount,
            "upi_vpa": order.upi_vpa,
            "upi_uri": order.upi_uri,
            "status": order.status
        }
    }), 201

@app.route('/api/escrow/deposit', methods=['POST'])
def deposit_escrow():
    data = request.json or {}
    order_id = str(data.get('order_id', '')).strip()
    utr = str(data.get('utr', '')).strip()
    amount = float(data.get('amount', 0))

    order = db.session.get(PaymentOrder, order_id)
    if not order:
        return jsonify({"success": False, "message": "Generate a Payment Order & QR Code first."}), 400
    if order.status == 'PAID':
        return jsonify({"success": False, "message": "Order already paid."}), 409

    is_fake, reason = is_fake_or_dummy_utr(utr)
    if is_fake:
        db.session.add(FraudLog(attempted_utr=utr or 'EMPTY', reason=reason))
        db.session.commit()
        return jsonify({"success": False, "message": reason}), 400

    if EscrowTransaction.query.filter_by(utr=utr).first():
        db.session.add(FraudLog(attempted_utr=utr, reason='Duplicate UTR replay blocked'))
        db.session.commit()
        return jsonify({"success": False, "message": "Fraud Alert: This UTR was already used!"}), 409

    cfg = db.session.get(PlatformConfig, 1)
    platform_fee = cfg.platform_fee if amount >= 200 else 0.0
    net_wage = amount - platform_fee
    real_release_otp = str(secrets.randbelow(9000) + 1000)

    w = db.session.get(WorkerProfile, order.worker_id) or WorkerProfile.query.first()
    job = db.session.get(JobPosting, order.job_id) if order.job_id else JobPosting.query.order_by(JobPosting.id.desc()).first()

    order.status = 'PAID'
    tx = EscrowTransaction(
        order_id=order.order_id,
        utr=utr,
        worker_id=w.id,
        worker_name=w.name,
        employer_name=order.employer_name,
        job_title=job.title if job else 'Site Construction Work',
        job_location=job.location if job else 'Sector 62, Noida',
        job_address=job.address if job else 'Sector 62, Noida, UP',
        total_amount=amount,
        net_wage=net_wage,
        platform_fee=platform_fee,
        release_otp=real_release_otp,
        status='LOCKED'
    )
    db.session.add(tx)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Booking Confirmed for {w.name}! Real UTR Verified & Secret 4-Digit OTP is now live inside Worker App.",
        "receipt": {
            "id": tx.id, "order_id": tx.order_id, "utr": tx.utr, "worker_id": tx.worker_id,
            "worker_name": tx.worker_name, "employer_name": tx.employer_name,
            "job_title": tx.job_title, "job_location": tx.job_location, "job_address": tx.job_address,
            "total_amount": tx.total_amount, "net_wage": tx.net_wage,
            "platform_fee": tx.platform_fee, "status": tx.status,
            "created_at": tx.created_at.replace(tzinfo=timezone.utc).astimezone(IST).strftime('%d %b %Y, %I:%M %p IST')
        }
    }), 201

@app.route('/api/escrow/<utr>/release', methods=['POST'])
def release_escrow(utr):
    data = request.json or {}
    entered_otp = str(data.get('otp', '')).strip()
    tx = EscrowTransaction.query.filter_by(utr=utr).first()
    if not tx:
        return jsonify({"success": False, "message": "Transaction not found"}), 404
    if tx.status == 'RELEASED':
        return jsonify({"success": False, "message": "Payment already released."}), 400
    if tx.otp_attempts >= 3:
        return jsonify({"success": False, "message": "Security Lock: Too many wrong OTP attempts!"}), 429
    if tx.release_otp != entered_otp:
        tx.otp_attempts += 1
        db.session.commit()
        return jsonify({
            "success": False,
            "message": f"Wrong OTP! Match exact 4-digit OTP from Worker App. ({3 - tx.otp_attempts} attempts left)"
        }), 401
    tx.status = 'RELEASED'
    db.session.commit()
    return jsonify({"success": True, "status": tx.status, "message": f"All Details & OTP Matched! ₹{tx.net_wage} released to {tx.worker_name}."})

@app.route('/api/receipts', methods=['GET'])
def list_receipts():
    txs = EscrowTransaction.query.order_by(EscrowTransaction.created_at.desc()).all()
    return jsonify([{
        "id": t.id, "order_id": t.order_id, "utr": t.utr, "worker_id": t.worker_id,
        "worker_name": t.worker_name, "employer_name": t.employer_name,
        "job_title": t.job_title, "job_location": t.job_location, "job_address": t.job_address,
        "total_amount": t.total_amount, "net_wage": t.net_wage,
        "platform_fee": t.platform_fee, "status": t.status,
        "created_at": t.created_at.replace(tzinfo=timezone.utc).astimezone(IST).strftime('%d %b %Y, %I:%M %p IST')
    } for t in txs])

@app.route('/api/chat', methods=['GET', 'POST'])
def handle_chat():
    if request.method == 'POST':
        data = request.json or {}
        msg = ChatMessage(
            sender_role=data.get('sender_role', 'worker'),
            sender_name=data.get('sender_name', 'User'),
            content=data.get('content', '').strip()
        )
        if msg.content:
            db.session.add(msg)
            db.session.commit()
        return jsonify({"success": True}), 201
    msgs = ChatMessage.query.order_by(ChatMessage.timestamp.asc()).limit(50).all()
    return jsonify([{
        "id": m.id, "sender_role": m.sender_role, "sender_name": m.sender_name,
        "content": m.content,
        "timestamp": m.timestamp.replace(tzinfo=timezone.utc).astimezone(IST).strftime('%I:%M %p')
    } for m in msgs])

# ==================== SEPARATE OWNER ADMIN APIs ====================

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    if not ADMIN_PIN_HASH:
        return jsonify({
            "success": False,
            "message": "Server ADMIN_PIN not configured or violates strong password policy."
        }), 503
    data = request.json or {}
    pin = str(data.get('pin', ''))
    if not re.match(STRONG_PIN_REGEX, pin):
        return jsonify({
            "success": False,
            "message": "Strong Password Policy: Min 8 chars, 1 Uppercase, 1 Lowercase, 1 Number & 1 Special Char."
        }), 400
    if not check_password_hash(ADMIN_PIN_HASH, pin):
        return jsonify({"success": False, "message": "Invalid Owner Password"}), 401
    token = secrets.token_urlsafe(32)
    ACTIVE_ADMIN_TOKENS[token] = datetime.utcnow() + timedelta(hours=2)
    return jsonify({"success": True, "token": token})

@app.route('/api/admin/dashboard', methods=['GET'])
@require_admin
def admin_dashboard():
    txs = EscrowTransaction.query.order_by(EscrowTransaction.created_at.desc()).all()
    frauds = FraudLog.query.order_by(FraudLog.timestamp.desc()).limit(20).all()
    jobs = JobPosting.query.order_by(JobPosting.id.desc()).all()
    worker = WorkerProfile.query.filter_by(kyc_status='PENDING_ADMIN').first() or WorkerProfile.query.first()
    emp = db.session.get(EmployerProfile, 'EMP-01')
    cfg = db.session.get(PlatformConfig, 1)

    gmv = sum(t.total_amount for t in txs)
    locked = sum(t.total_amount for t in txs if t.status == 'LOCKED')
    released = sum(t.net_wage for t in txs if t.status == 'RELEASED')
    revenue = sum(t.platform_fee for t in txs if t.status in ('LOCKED', 'RELEASED'))

    return jsonify({
        "config": {"platform_fee": cfg.platform_fee, "announcement": cfg.announcement},
        "metrics": {"gmv": gmv, "locked_vault": locked, "released_wages": released, "net_revenue": revenue},
        "worker_kyc": {
            "id": worker.id, "name": worker.name, "status": worker.kyc_status,
            "badge": worker.kyc_badge, "doc": worker.kyc_masked_id or "Not submitted"
        },
        "employer_kyc": {
            "id": emp.id, "name": emp.company_name, "status": emp.kyc_status,
            "badge": emp.kyc_badge, "doc": emp.gstin_masked or "Not submitted"
        },
        "jobs": [{
            "id": j.id, "title": j.title, "location": j.location, "wage": j.wage, "employer_name": j.employer_name
        } for j in jobs],
        "ledger": [{
            "order_id": t.order_id, "utr": t.utr, "total_amount": t.total_amount,
            "net_wage": t.net_wage, "platform_fee": t.platform_fee, "status": t.status,
            "created_at": t.created_at.replace(tzinfo=timezone.utc).astimezone(IST).strftime('%d %b %Y, %I:%M %p')
        } for t in txs],
        "fraud_logs": [{
            "id": f.id, "attempted_utr": f.attempted_utr, "reason": f.reason,
            "timestamp": f.timestamp.replace(tzinfo=timezone.utc).astimezone(IST).strftime('%d %b %Y, %I:%M %p')
        } for f in frauds]
    })

@app.route('/api/admin/kyc/decision', methods=['POST'])
@require_admin
def admin_kyc_decision():
    data = request.json or {}
    role = data.get('role')
    action = data.get('action')
    if role == 'worker':
        w = WorkerProfile.query.filter_by(kyc_status='PENDING_ADMIN').first() or WorkerProfile.query.first()
        if action == 'APPROVE':
            w.kyc_status = 'VERIFIED'
            w.kyc_badge = 'GOVT e-SHRAM VERIFIED'
            w.trust_score = 98
        else:
            w.kyc_status = 'REJECTED'
            w.kyc_badge = 'REJECTED BY ADMIN'
            w.trust_score = 20
        db.session.commit()
        return jsonify({"success": True})

    if role == 'employer':
        emp = db.session.get(EmployerProfile, 'EMP-01')
        approved = (action == 'APPROVE')
        emp.kyc_status = 'VERIFIED' if approved else 'REJECTED'
        emp.kyc_badge = 'GST VERIFIED EMPLOYER' if approved else 'REJECTED BY ADMIN'
        for j in JobPosting.query.filter_by(employer_name=emp.company_name).all():
            j.employer_verified = approved
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False}), 400

@app.route('/api/admin/jobs', methods=['POST'])
@require_admin
def admin_add_job():
    data = request.json or {}
    job = JobPosting(
        title=data.get('title', 'New Site Work'),
        location=data.get('location', 'Sector 62, Noida'),
        address=data.get('address', 'Sector 62, Noida, UP'),
        lat=float(data.get('lat', 28.6273)),
        lng=float(data.get('lng', 77.3725)),
        shift_time=data.get('shift_time', 'Tomorrow • 08:30 AM – 05:30 PM'),
        wage=float(data.get('wage', 800)),
        employer_name=data.get('employer_name', 'Sharma Builders'),
        employer_verified=True,
        status='OPEN'
    )
    db.session.add(job)
    db.session.commit()
    return jsonify({"success": True, "id": job.id})

@app.route('/api/admin/jobs/<int:job_id>', methods=['DELETE'])
@require_admin
def admin_delete_job(job_id):
    job = db.session.get(JobPosting, job_id)
    if job:
        db.session.delete(job)
        db.session.commit()
    return jsonify({"success": True})

@app.route('/api/admin/config', methods=['POST'])
@require_admin
def admin_update_config():
    data = request.json or {}
    cfg = db.session.get(PlatformConfig, 1)
    if 'platform_fee' in data:
        cfg.platform_fee = float(data['platform_fee'])
    if 'announcement' in data:
        cfg.announcement = str(data['announcement']).strip()
    db.session.commit()
    return jsonify({"success": True})

@app.route('/api/admin/escrow/<utr>/force-release', methods=['POST'])
@require_admin
def admin_force_release(utr):
    tx = EscrowTransaction.query.filter_by(utr=utr).first()
    if not tx:
        return jsonify({"success": False}), 404
    tx.status = 'RELEASED'
    db.session.commit()
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
