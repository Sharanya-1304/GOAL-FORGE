from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import os
import io
import csv
import logging
import bcrypt
import jwt
import asyncio
import resend
from bson import ObjectId

# Configure logger
logger = logging.getLogger(__name__)
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except Exception:  # Optional dependency for AI endpoints
    LlmChat = None
    UserMessage = None

# Setup logging first (before any code that uses logger)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Validate required environment variables
def validate_env_vars():
    required_vars = ['MONGO_URL', 'DB_NAME', 'JWT_SECRET']
    missing = [var for var in required_vars if var not in os.environ]
    if missing:
        logger.error(f"Missing required environment variables: {', '.join(missing)}")
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

# Call validation before app setup
try:
    validate_env_vars()
except RuntimeError as e:
    logger.error(f"Environment validation failed: {e}")
    raise

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend setup
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# JWT Config
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT helpers
def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# Auth dependency
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Helper: serialize MongoDB document
def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

# Email helper
async def send_email_async(recipient: str, subject: str, html: str):
    params = {"from": SENDER_EMAIL, "to": [recipient], "subject": subject, "html": html}
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {recipient}: {email.get('id')}")
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {str(e)}")

# Activity logging
async def log_activity(user_id: str, user_name: str, action: str, entity_type: str, entity_id: str = None, description: str = ""):
    await db.activities.insert_one({
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "description": description,
        "timestamp": datetime.now(timezone.utc)
    })

# Notification helper
async def create_notification(user_id: str, title: str, message: str, type: str = "info", link: str = None):
    await db.notifications.insert_one({
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })

# Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["employee", "manager", "admin"] = "employee"
    department: Optional[str] = None
    manager_email: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoalCreate(BaseModel):
    thrust_area: str
    title: str
    description: str
    uom: Literal["numeric", "percentage", "timeline", "zero"]
    target: str
    weightage: float
    metric_type: Optional[Literal["higher_better", "lower_better"]] = "higher_better"
    priority: Optional[Literal["low", "medium", "high"]] = "medium"
    tags: Optional[List[str]] = []

    @field_validator('weightage')
    def validate_weightage(cls, v):
        if v < 10 or v > 100:
            raise ValueError('Weightage must be between 10 and 100')
        return v

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target: Optional[str] = None
    weightage: Optional[float] = None
    status: Optional[Literal["pending", "approved", "rejected", "rework"]] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    tags: Optional[List[str]] = None

class RejectRequest(BaseModel):
    reason: str

class CheckInCreate(BaseModel):
    quarter: Literal["Q1", "Q2", "Q3", "Q4"]
    actual_achievement: str
    status: Literal["not_started", "on_track", "completed"]
    manager_comment: Optional[str] = None

class MilestoneCreate(BaseModel):
    title: str
    target_date: Optional[str] = None

class CommentCreate(BaseModel):
    content: str

class AIGoalSuggestRequest(BaseModel):
    department: str
    role: str
    thrust_area: Optional[str] = None

# App setup
app = FastAPI(title="GoalForge API", version="2.0")
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "GoalForge API v2.0", "status": "operational"}

# Auth routes
auth_router = APIRouter(prefix="/auth", tags=["auth"])

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

@auth_router.post("/register")
async def register(input: RegisterRequest, response: Response):
    email = input.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    manager_id = None
    if input.manager_email:
        manager = await db.users.find_one({"email": input.manager_email.lower()}, {"_id": 1})
        if manager:
            manager_id = str(manager["_id"])
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(input.password),
        "name": input.name,
        "role": input.role,
        "department": input.department,
        "manager_id": manager_id,
        "avatar_url": None,
        "points": 0,
        "badges": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    user_doc["id"] = user_id
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    
    await log_activity(user_id, input.name, "registered", "user", user_id, f"{input.name} joined GoalForge")
    
    return user_doc

@auth_router.post("/login")
async def login(input: LoginRequest, response: Response, request: Request):
    email = input.email.lower()
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    user["id"] = user_id
    user.pop("_id", None)
    user.pop("password_hash", None)
    return user

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", samesite="none", secure=True)
    response.delete_cookie("refresh_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out successfully"}

@auth_router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

api_router.include_router(auth_router)

# Goal routes
goal_router = APIRouter(prefix="/goals", tags=["goals"])

@goal_router.post("")
async def create_goal(input: GoalCreate, user: dict = Depends(get_current_user)):
    # Check max 8 goals
    existing_count = await db.goals.count_documents({"user_id": user["id"], "deleted": {"$ne": True}})
    if existing_count >= 8:
        raise HTTPException(status_code=400, detail="Maximum 8 goals allowed per user")
    
    # Check total weightage doesn't exceed 100%
    existing_goals = await db.goals.find({"user_id": user["id"], "deleted": {"$ne": True}}, {"weightage": 1}).to_list(8)
    current_total = sum(g.get("weightage", 0) for g in existing_goals)
    if current_total + input.weightage > 100:
        raise HTTPException(status_code=400, detail=f"Total weightage cannot exceed 100%. Current: {current_total}%, Adding: {input.weightage}%")
    
    goal_doc = {
        "user_id": user["id"],
        "user_name": user["name"],
        "thrust_area": input.thrust_area,
        "title": input.title,
        "description": input.description,
        "uom": input.uom,
        "target": input.target,
        "weightage": input.weightage,
        "metric_type": input.metric_type,
        "priority": input.priority or "medium",
        "tags": input.tags or [],
        "status": "pending",
        "locked": False,
        "shared_from": None,
        "created_at": datetime.now(timezone.utc),
        "deleted": False
    }
    
    result = await db.goals.insert_one(goal_doc)
    goal_doc["id"] = str(result.inserted_id)
    goal_doc.pop("_id", None)
    
    # Award points for creating goal
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$inc": {"points": 10}})
    
    # Notify manager
    if user.get("manager_id"):
        manager = await db.users.find_one({"_id": ObjectId(user["manager_id"])}, {"email": 1, "name": 1})
        if manager:
            await create_notification(
                user["manager_id"],
                "New Goal Submitted",
                f"{user['name']} submitted: {input.title}",
                "info",
                f"/team-goals"
            )
            await send_email_async(
                manager["email"],
                f"New Goal Submitted by {user['name']}",
                f"<p>{user['name']} has submitted a new goal: <strong>{input.title}</strong></p><p>Please review and approve.</p>"
            )
    
    await log_activity(user["id"], user["name"], "created", "goal", goal_doc["id"], f"Created goal: {input.title}")
    
    return goal_doc

@goal_router.get("")
async def get_goals(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    thrust_area: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"user_id": user["id"], "deleted": {"$ne": True}}
    if status:
        query["status"] = status
    if thrust_area:
        query["thrust_area"] = thrust_area
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    goals = await db.goals.find(query).sort("created_at", -1).to_list(100)
    return [serialize_doc(g) for g in goals]

@goal_router.get("/team")
async def get_team_goals(user: dict = Depends(get_current_user), status: Optional[str] = None):
    if user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can view team goals")
    
    # Admin sees all goals
    if user["role"] == "admin":
        query = {"deleted": {"$ne": True}}
    else:
        team_members = await db.users.find({"manager_id": user["id"]}, {"_id": 1}).to_list(1000)
        team_ids = [str(m["_id"]) for m in team_members]
        query = {"user_id": {"$in": team_ids}, "deleted": {"$ne": True}}
    
    if status:
        query["status"] = status
    
    goals = await db.goals.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_doc(g) for g in goals]

@goal_router.get("/{goal_id}")
async def get_goal(goal_id: str, user: dict = Depends(get_current_user)):
    goal = await db.goals.find_one({"_id": ObjectId(goal_id)})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return serialize_doc(goal)

@goal_router.patch("/{goal_id}")
async def update_goal(goal_id: str, input: GoalUpdate, user: dict = Depends(get_current_user)):
    goal = await db.goals.find_one({"_id": ObjectId(goal_id)})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Permission check: owner, their manager, or admin
    is_owner = goal["user_id"] == user["id"]
    is_manager = user["role"] == "manager"
    is_admin = user["role"] == "admin"
    
    if not (is_owner or is_manager or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to update this goal")
    
    if goal.get("locked") and not is_admin:
        raise HTTPException(status_code=403, detail="Goal is locked. Contact admin to unlock.")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": update_data})
        await db.audit_logs.insert_one({
            "entity_type": "goal",
            "entity_id": goal_id,
            "action": "updated",
            "user_id": user["id"],
            "user_name": user["name"],
            "changes": update_data,
            "timestamp": datetime.now(timezone.utc)
        })
    
    return {"message": "Goal updated successfully"}

@goal_router.delete("/{goal_id}")
async def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    goal = await db.goals.find_one({"_id": ObjectId(goal_id)})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if goal["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
    
    if goal.get("locked"):
        raise HTTPException(status_code=403, detail="Cannot delete locked goal")
    
    await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"deleted": True}})
    await log_activity(user["id"], user["name"], "deleted", "goal", goal_id, f"Deleted goal: {goal['title']}")
    return {"message": "Goal deleted"}

@goal_router.post("/{goal_id}/approve")
async def approve_goal(goal_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers can approve goals")
    
    goal = await db.goals.find_one({"_id": ObjectId(goal_id)})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"status": "approved", "locked": True}})
    
    # Award points and badge to employee
    await db.users.update_one({"_id": ObjectId(goal["user_id"])}, {"$inc": {"points": 25}})
    
    # Notify employee
    await create_notification(goal["user_id"], "Goal Approved!", f"Your goal '{goal['title']}' was approved", "success", "/goals")
    employee = await db.users.find_one({"_id": ObjectId(goal["user_id"])}, {"email": 1, "name": 1})
    if employee:
        await send_email_async(
            employee["email"],
            "Goal Approved on GoalForge",
            f"<p>Your goal <strong>{goal['title']}</strong> has been approved by your manager.</p>"
        )
    
    await log_activity(user["id"], user["name"], "approved", "goal", goal_id, f"Approved: {goal['title']}")
    return {"message": "Goal approved and locked"}

@goal_router.post("/{goal_id}/reject")
async def reject_goal(goal_id: str, input: RejectRequest, user: dict = Depends(get_current_user)):
    if user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers can reject goals")
    
    goal = await db.goals.find_one({"_id": ObjectId(goal_id)})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"status": "rework", "rejection_reason": input.reason}})
    
    # Notify employee
    await create_notification(goal["user_id"], "Goal Returned for Rework", f"'{goal['title']}': {input.reason}", "warning", "/goals")
    employee = await db.users.find_one({"_id": ObjectId(goal["user_id"])}, {"email": 1, "name": 1})
    if employee:
        await send_email_async(
            employee["email"],
            "Goal Returned for Rework",
            f"<p>Your goal <strong>{goal['title']}</strong> needs revision.</p><p>Reason: {input.reason}</p>"
        )
    
    await log_activity(user["id"], user["name"], "rejected", "goal", goal_id, f"Returned for rework: {goal['title']}")
    return {"message": "Goal returned for rework"}

@goal_router.post("/{goal_id}/unlock")
async def unlock_goal(goal_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can unlock goals")
    
    await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": {"locked": False}})
    await log_activity(user["id"], user["name"], "unlocked", "goal", goal_id, "Unlocked goal for editing")
    return {"message": "Goal unlocked"}

# Comments on goals
@goal_router.post("/{goal_id}/comments")
async def add_comment(goal_id: str, input: CommentCreate, user: dict = Depends(get_current_user)):
    comment_doc = {
        "goal_id": goal_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_role": user["role"],
        "content": input.content,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.comments.insert_one(comment_doc)
    comment_doc["id"] = str(result.inserted_id)
    comment_doc.pop("_id", None)
    return comment_doc

@goal_router.get("/{goal_id}/comments")
async def get_comments(goal_id: str, user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"goal_id": goal_id}).sort("created_at", 1).to_list(100)
    return [serialize_doc(c) for c in comments]

# Milestones
@goal_router.post("/{goal_id}/milestones")
async def add_milestone(goal_id: str, input: MilestoneCreate, user: dict = Depends(get_current_user)):
    milestone_doc = {
        "goal_id": goal_id,
        "title": input.title,
        "target_date": input.target_date,
        "completed": False,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.milestones.insert_one(milestone_doc)
    milestone_doc["id"] = str(result.inserted_id)
    milestone_doc.pop("_id", None)
    return milestone_doc

@goal_router.get("/{goal_id}/milestones")
async def get_milestones(goal_id: str, user: dict = Depends(get_current_user)):
    milestones = await db.milestones.find({"goal_id": goal_id}).sort("created_at", 1).to_list(100)
    return [serialize_doc(m) for m in milestones]

@goal_router.patch("/milestones/{milestone_id}/toggle")
async def toggle_milestone(milestone_id: str, user: dict = Depends(get_current_user)):
    milestone = await db.milestones.find_one({"_id": ObjectId(milestone_id)})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    await db.milestones.update_one({"_id": ObjectId(milestone_id)}, {"$set": {"completed": not milestone.get("completed", False)}})
    return {"message": "Milestone updated"}

api_router.include_router(goal_router)

# Check-in routes
checkin_router = APIRouter(prefix="/checkins", tags=["checkins"])

@checkin_router.post("/{goal_id}")
async def create_checkin(goal_id: str, input: CheckInCreate, user: dict = Depends(get_current_user)):
    goal = await db.goals.find_one({"_id": ObjectId(goal_id)})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Calculate progress score
    progress_score = 0.0
    try:
        if goal["uom"] == "zero":
            progress_score = 100.0 if float(input.actual_achievement) == 0 else 0.0
        elif goal["uom"] == "timeline":
            progress_score = 100.0 if input.status == "completed" else 50.0 if input.status == "on_track" else 0.0
        else:
            actual = float(input.actual_achievement)
            target = float(goal["target"])
            if target > 0:
                if goal.get("metric_type") == "lower_better":
                    progress_score = (target / actual) * 100 if actual > 0 else 0
                else:
                    progress_score = (actual / target) * 100
                progress_score = min(progress_score, 100.0)
    except:
        pass
    
    checkin_doc = {
        "goal_id": goal_id,
        "goal_title": goal["title"],
        "user_id": goal["user_id"],
        "quarter": input.quarter,
        "actual_achievement": input.actual_achievement,
        "status": input.status,
        "progress_score": round(progress_score, 2),
        "manager_comment": input.manager_comment,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.checkins.insert_one(checkin_doc)
    
    # Award points based on status
    if input.status == "completed":
        await db.users.update_one({"_id": ObjectId(goal["user_id"])}, {"$inc": {"points": 50}})
    elif input.status == "on_track":
        await db.users.update_one({"_id": ObjectId(goal["user_id"])}, {"$inc": {"points": 15}})
    
    await log_activity(user["id"], user["name"], "checked-in", "goal", goal_id, f"{input.quarter}: {input.status} ({round(progress_score, 1)}%)")
    
    return {"message": "Check-in recorded", "progress_score": round(progress_score, 2)}

@checkin_router.get("/goal/{goal_id}")
async def get_checkins(goal_id: str, user: dict = Depends(get_current_user)):
    checkins = await db.checkins.find({"goal_id": goal_id}).sort("created_at", -1).to_list(100)
    return [serialize_doc(c) for c in checkins]

api_router.include_router(checkin_router)

# Analytics routes
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])

@analytics_router.get("/dashboard")
async def get_analytics_dashboard(user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        total_users = await db.users.count_documents({})
        total_goals = await db.goals.count_documents({"deleted": {"$ne": True}})
        approved_goals = await db.goals.count_documents({"status": "approved", "deleted": {"$ne": True}})
        pending_goals = await db.goals.count_documents({"status": "pending", "deleted": {"$ne": True}})
        total_checkins = await db.checkins.count_documents({})
        
        return {
            "total_users": total_users,
            "total_goals": total_goals,
            "approved_goals": approved_goals,
            "pending_goals": pending_goals,
            "total_checkins": total_checkins
        }
    elif user["role"] == "manager":
        team_members = await db.users.find({"manager_id": user["id"]}, {"_id": 1}).to_list(1000)
        team_ids = [str(m["_id"]) for m in team_members]
        my_goals = await db.goals.count_documents({"user_id": user["id"], "deleted": {"$ne": True}})
        team_goals = await db.goals.count_documents({"user_id": {"$in": team_ids}, "deleted": {"$ne": True}})
        pending = await db.goals.count_documents({"user_id": {"$in": team_ids}, "status": "pending", "deleted": {"$ne": True}})
        approved = await db.goals.count_documents({"user_id": {"$in": team_ids}, "status": "approved", "deleted": {"$ne": True}})
        return {"my_goals": my_goals, "team_goals": team_goals, "pending_approvals": pending, "approved_goals": approved, "team_size": len(team_ids)}
    
    my_goals = await db.goals.count_documents({"user_id": user["id"], "deleted": {"$ne": True}})
    approved = await db.goals.count_documents({"user_id": user["id"], "status": "approved", "deleted": {"$ne": True}})
    pending = await db.goals.count_documents({"user_id": user["id"], "status": "pending", "deleted": {"$ne": True}})
    my_checkins = await db.checkins.count_documents({"user_id": user["id"]})
    return {"my_goals": my_goals, "approved_goals": approved, "pending_goals": pending, "total_checkins": my_checkins, "points": user.get("points", 0)}

@analytics_router.get("/completion-rates")
async def get_completion_rates(user: dict = Depends(get_current_user)):
    users = await db.users.find({"role": "employee"}, {"_id": 1, "name": 1, "department": 1, "points": 1}).to_list(1000)
    
    completion_data = []
    for u in users:
        user_id = str(u["_id"])
        total_goals = await db.goals.count_documents({"user_id": user_id, "deleted": {"$ne": True}})
        approved_goals = await db.goals.count_documents({"user_id": user_id, "status": "approved", "deleted": {"$ne": True}})
        
        # Average progress from check-ins
        checkins = await db.checkins.find({"user_id": user_id}).to_list(100)
        avg_progress = sum(c.get("progress_score", 0) for c in checkins) / len(checkins) if checkins else 0
        
        completion_data.append({
            "user_id": user_id,
            "name": u["name"],
            "department": u.get("department", "N/A"),
            "total_goals": total_goals,
            "approved_goals": approved_goals,
            "completion_rate": round((approved_goals / total_goals * 100), 2) if total_goals > 0 else 0,
            "avg_progress": round(avg_progress, 2),
            "points": u.get("points", 0)
        })
    
    return completion_data

@analytics_router.get("/qoq-trends")
async def get_qoq_trends(user: dict = Depends(get_current_user)):
    quarters = ["Q1", "Q2", "Q3", "Q4"]
    trends = []
    for q in quarters:
        query = {"quarter": q}
        if user["role"] == "employee":
            query["user_id"] = user["id"]
        checkins = await db.checkins.find(query).to_list(1000)
        avg = sum(c.get("progress_score", 0) for c in checkins) / len(checkins) if checkins else 0
        completed = sum(1 for c in checkins if c.get("status") == "completed")
        trends.append({"quarter": q, "avg_progress": round(avg, 2), "completed": completed, "total": len(checkins)})
    return trends

@analytics_router.get("/thrust-area-distribution")
async def get_thrust_area_distribution(user: dict = Depends(get_current_user)):
    query = {"deleted": {"$ne": True}}
    if user["role"] == "employee":
        query["user_id"] = user["id"]
    
    goals = await db.goals.find(query, {"thrust_area": 1, "status": 1}).to_list(1000)
    distribution = {}
    for g in goals:
        ta = g.get("thrust_area", "Other")
        if ta not in distribution:
            distribution[ta] = {"total": 0, "approved": 0}
        distribution[ta]["total"] += 1
        if g.get("status") == "approved":
            distribution[ta]["approved"] += 1
    return [{"name": k, "total": v["total"], "approved": v["approved"]} for k, v in distribution.items()]

@analytics_router.get("/leaderboard")
async def get_leaderboard(user: dict = Depends(get_current_user)):
    users = await db.users.find({"role": "employee"}).sort("points", -1).limit(10).to_list(10)
    return [{"id": str(u["_id"]), "name": u["name"], "department": u.get("department", "N/A"), "points": u.get("points", 0), "avatar_url": u.get("avatar_url")} for u in users]

@analytics_router.get("/audit-trail")
async def get_audit_trail(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view audit trail")
    logs = await db.audit_logs.find().sort("timestamp", -1).limit(100).to_list(100)
    return [serialize_doc(l) for l in logs]

@analytics_router.get("/workforce-insights")
async def get_workforce_insights(user: dict = Depends(get_current_user)):
    """HR Analytics: department, tenure, performance distribution, etc."""
    if user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find({"role": {"$in": ["employee", "manager"]}}, {"password_hash": 0}).to_list(1000)
    
    # Department headcount
    dept_counts = {}
    for u in users:
        d = u.get("department", "Unknown")
        dept_counts[d] = dept_counts.get(d, 0) + 1
    
    # Performance distribution (1-5 score buckets)
    perf_dist = {"1-2": 0, "2-3": 0, "3-4": 0, "4-5": 0}
    for u in users:
        score = u.get("performance_score", 0)
        if score < 2: perf_dist["1-2"] += 1
        elif score < 3: perf_dist["2-3"] += 1
        elif score < 4: perf_dist["3-4"] += 1
        else: perf_dist["4-5"] += 1
    
    # Tenure distribution
    tenure_dist = {"0-1 yrs": 0, "1-3 yrs": 0, "3-5 yrs": 0, "5+ yrs": 0}
    for u in users:
        yrs = u.get("years_at_company", 0)
        if yrs < 1: tenure_dist["0-1 yrs"] += 1
        elif yrs < 3: tenure_dist["1-3 yrs"] += 1
        elif yrs < 5: tenure_dist["3-5 yrs"] += 1
        else: tenure_dist["5+ yrs"] += 1
    
    # Engagement vs Performance scatter
    scatter = [{
        "name": u["name"],
        "department": u.get("department", "N/A"),
        "engagement": u.get("engagement_score", 0),
        "performance": u.get("performance_score", 0) * 20,  # scale to 100
        "tenure": u.get("years_at_company", 0)
    } for u in users if u.get("engagement_score") and u.get("performance_score")]
    
    # Recruitment source effectiveness
    source_dist = {}
    for u in users:
        src = u.get("recruitment_source", "Unknown")
        if src not in source_dist:
            source_dist[src] = {"count": 0, "avg_performance": 0, "total_perf": 0}
        source_dist[src]["count"] += 1
        source_dist[src]["total_perf"] += u.get("performance_score", 0)
    
    source_data = []
    for src, data in source_dist.items():
        source_data.append({
            "source": src,
            "count": data["count"],
            "avg_performance": round(data["total_perf"] / data["count"], 2) if data["count"] > 0 else 0
        })
    
    # Attrition risk
    attrition = {"low": 0, "medium": 0, "high": 0}
    for u in users:
        risk = u.get("attrition_risk", "low")
        attrition[risk] = attrition.get(risk, 0) + 1
    
    # Average metrics by department
    dept_metrics = {}
    for u in users:
        d = u.get("department", "Unknown")
        if d not in dept_metrics:
            dept_metrics[d] = {"engagement_sum": 0, "performance_sum": 0, "satisfaction_sum": 0, "count": 0}
        dept_metrics[d]["engagement_sum"] += u.get("engagement_score", 0)
        dept_metrics[d]["performance_sum"] += u.get("performance_score", 0) * 20
        dept_metrics[d]["satisfaction_sum"] += u.get("satisfaction_score", 0)
        dept_metrics[d]["count"] += 1
    
    dept_avg = [{
        "department": d,
        "engagement": round(m["engagement_sum"] / m["count"], 1) if m["count"] else 0,
        "performance": round(m["performance_sum"] / m["count"], 1) if m["count"] else 0,
        "satisfaction": round(m["satisfaction_sum"] / m["count"], 1) if m["count"] else 0,
        "headcount": m["count"]
    } for d, m in dept_metrics.items()]
    
    # Salary band analysis
    salaries = [u.get("salary", 0) for u in users if u.get("salary")]
    salary_stats = {
        "min": min(salaries) if salaries else 0,
        "max": max(salaries) if salaries else 0,
        "avg": round(sum(salaries) / len(salaries)) if salaries else 0,
        "total_payroll": sum(salaries)
    }
    
    # Top performers
    top_performers = sorted(users, key=lambda u: u.get("performance_score", 0), reverse=True)[:10]
    top_list = [{
        "name": u["name"],
        "department": u.get("department", "N/A"),
        "performance_score": u.get("performance_score", 0),
        "engagement_score": u.get("engagement_score", 0),
        "years": u.get("years_at_company", 0)
    } for u in top_performers]
    
    return {
        "total_headcount": len(users),
        "department_counts": [{"name": k, "count": v} for k, v in dept_counts.items()],
        "performance_distribution": [{"range": k, "count": v} for k, v in perf_dist.items()],
        "tenure_distribution": [{"range": k, "count": v} for k, v in tenure_dist.items()],
        "engagement_performance_scatter": scatter,
        "recruitment_sources": source_data,
        "attrition_risk": [{"level": k, "count": v} for k, v in attrition.items()],
        "department_metrics": dept_avg,
        "salary_stats": salary_stats,
        "top_performers": top_list
    }

@analytics_router.get("/goal-velocity")
async def get_goal_velocity(user: dict = Depends(get_current_user)):
    """Goal creation and completion velocity over time - last 12 months"""
    monthly_data = []
    now = datetime.now(timezone.utc)
    
    for i in range(11, -1, -1):
        # Compute proper month boundaries
        target_month = now.month - i
        target_year = now.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        
        month_start = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
        next_month = target_month + 1
        next_year = target_year
        if next_month > 12:
            next_month = 1
            next_year += 1
        month_end = datetime(next_year, next_month, 1, tzinfo=timezone.utc)
        
        created = await db.goals.count_documents({
            "created_at": {"$gte": month_start, "$lt": month_end},
            "deleted": {"$ne": True}
        })
        approved = await db.goals.count_documents({
            "created_at": {"$gte": month_start, "$lt": month_end},
            "status": "approved",
            "deleted": {"$ne": True}
        })
        checkins = await db.checkins.count_documents({
            "created_at": {"$gte": month_start, "$lt": month_end}
        })
        
        monthly_data.append({
            "month": month_start.strftime("%b %y"),
            "month_full": month_start.strftime("%B %Y"),
            "created": created,
            "approved": approved,
            "checkins": checkins
        })
    
    return monthly_data

@analytics_router.get("/heatmap")
async def get_heatmap(user: dict = Depends(get_current_user)):
    """Department x Quarter completion heatmap"""
    quarters = ["Q1", "Q2", "Q3", "Q4"]
    departments_set = set()
    users = await db.users.find({"role": "employee"}, {"_id": 1, "department": 1}).to_list(1000)
    user_dept_map = {str(u["_id"]): u.get("department", "Unknown") for u in users}
    for u in users:
        departments_set.add(u.get("department", "Unknown"))
    
    departments = sorted(list(departments_set))
    
    heatmap_data = []
    for dept in departments:
        dept_user_ids = [uid for uid, d in user_dept_map.items() if d == dept]
        row = {"department": dept}
        for q in quarters:
            checkins = await db.checkins.find({
                "user_id": {"$in": dept_user_ids},
                "quarter": q
            }).to_list(1000)
            avg = sum(c.get("progress_score", 0) for c in checkins) / len(checkins) if checkins else 0
            row[q] = round(avg, 1)
        heatmap_data.append(row)
    
    return heatmap_data

@analytics_router.get("/hr-insights")
async def get_hr_insights(user: dict = Depends(get_current_user)):
    """Rich HR analytics inspired by Kaggle HR datasets"""
    if user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find({"role": {"$in": ["employee", "manager"]}}, {"password_hash": 0}).to_list(1000)
    
    # Salary by department
    salary_by_dept = {}
    for u in users:
        d = u.get("department", "N/A")
        if d not in salary_by_dept:
            salary_by_dept[d] = {"total": 0, "count": 0, "min": float('inf'), "max": 0}
        s = u.get("salary", 0)
        salary_by_dept[d]["total"] += s
        salary_by_dept[d]["count"] += 1
        salary_by_dept[d]["min"] = min(salary_by_dept[d]["min"], s) if s > 0 else salary_by_dept[d]["min"]
        salary_by_dept[d]["max"] = max(salary_by_dept[d]["max"], s)
    
    salary_dept_data = [{
        "department": d,
        "avg_salary": round(v["total"] / v["count"]) if v["count"] else 0,
        "min_salary": v["min"] if v["min"] != float('inf') else 0,
        "max_salary": v["max"]
    } for d, v in salary_by_dept.items()]
    
    # Salary distribution (bands)
    salary_bands = {"<50K": 0, "50-75K": 0, "75-100K": 0, "100-150K": 0, "150K+": 0}
    for u in users:
        s = u.get("salary", 0)
        if s < 50000: salary_bands["<50K"] += 1
        elif s < 75000: salary_bands["50-75K"] += 1
        elif s < 100000: salary_bands["75-100K"] += 1
        elif s < 150000: salary_bands["100-150K"] += 1
        else: salary_bands["150K+"] += 1
    
    # Gender distribution
    gender_dist = {}
    for u in users:
        g = u.get("gender", "N/A")
        gender_dist[g] = gender_dist.get(g, 0) + 1
    
    # Marital status
    marital_dist = {}
    for u in users:
        m = u.get("marital_status", "N/A")
        marital_dist[m] = marital_dist.get(m, 0) + 1
    
    # Position level distribution
    position_dist = {}
    for u in users:
        p = u.get("position_level", "N/A")
        position_dist[p] = position_dist.get(p, 0) + 1
    
    # Age distribution
    age_bands = {"23-30": 0, "31-40": 0, "41-50": 0, "51+": 0}
    for u in users:
        a = u.get("age", 0)
        if a <= 30: age_bands["23-30"] += 1
        elif a <= 40: age_bands["31-40"] += 1
        elif a <= 50: age_bands["41-50"] += 1
        elif a > 50: age_bands["51+"] += 1
    
    # Hire trend (hires per year - last 5 years)
    hire_trend = {}
    for u in users:
        hd = u.get("hire_date")
        if hd:
            year = hd.year if hasattr(hd, 'year') else int(str(hd)[:4])
            hire_trend[year] = hire_trend.get(year, 0) + 1
    hire_trend_list = sorted([{"year": str(k), "hires": v} for k, v in hire_trend.items()], key=lambda x: x["year"])
    
    # Training hours by department
    training_dept = {}
    for u in users:
        d = u.get("department", "N/A")
        if d not in training_dept:
            training_dept[d] = {"total": 0, "count": 0}
        training_dept[d]["total"] += u.get("training_hours", 0)
        training_dept[d]["count"] += 1
    training_data = [{"department": d, "avg_hours": round(v["total"] / v["count"]) if v["count"] else 0} for d, v in training_dept.items()]
    
    # Absences by department
    absence_dept = {}
    for u in users:
        d = u.get("department", "N/A")
        if d not in absence_dept:
            absence_dept[d] = {"total": 0, "count": 0}
        absence_dept[d]["total"] += u.get("absence_days", 0)
        absence_dept[d]["count"] += 1
    absence_data = [{"department": d, "avg_absences": round(v["total"] / v["count"], 1) if v["count"] else 0} for d, v in absence_dept.items()]
    
    # Promotion eligibility
    promo = {"Eligible": 0, "Not Eligible": 0}
    for u in users:
        promo["Eligible" if u.get("promotion_eligible") else "Not Eligible"] += 1
    
    # Salary vs Performance scatter
    salary_perf = [{
        "name": u["name"],
        "department": u.get("department", "N/A"),
        "salary": u.get("salary", 0),
        "performance": u.get("performance_score", 0),
        "tenure": u.get("years_at_company", 0)
    } for u in users if u.get("salary") and u.get("performance_score")]
    
    return {
        "salary_by_department": salary_dept_data,
        "salary_distribution": [{"band": k, "count": v} for k, v in salary_bands.items()],
        "gender_distribution": [{"name": k, "value": v} for k, v in gender_dist.items()],
        "marital_distribution": [{"name": k, "value": v} for k, v in marital_dist.items()],
        "position_distribution": [{"name": k, "value": v} for k, v in position_dist.items()],
        "age_distribution": [{"band": k, "count": v} for k, v in age_bands.items()],
        "hire_trend": hire_trend_list,
        "training_by_dept": training_data,
        "absence_by_dept": absence_data,
        "promotion_eligibility": [{"name": k, "value": v} for k, v in promo.items()],
        "salary_performance_scatter": salary_perf
    }

@analytics_router.get("/export/csv")
async def export_csv(user: dict = Depends(get_current_user)):
    if user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can export")
    
    if user["role"] == "admin":
        goals = await db.goals.find({"deleted": {"$ne": True}}).to_list(10000)
    else:
        team_members = await db.users.find({"manager_id": user["id"]}, {"_id": 1}).to_list(1000)
        team_ids = [str(m["_id"]) for m in team_members]
        goals = await db.goals.find({"user_id": {"$in": team_ids}, "deleted": {"$ne": True}}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Employee", "Thrust Area", "Goal Title", "UoM", "Target", "Weightage", "Status", "Priority", "Created"])
    
    for g in goals:
        writer.writerow([
            g.get("user_name", ""),
            g.get("thrust_area", ""),
            g.get("title", ""),
            g.get("uom", ""),
            g.get("target", ""),
            g.get("weightage", ""),
            g.get("status", ""),
            g.get("priority", ""),
            g.get("created_at", "").isoformat() if g.get("created_at") else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=goalforge_export.csv"}
    )

@analytics_router.get("/export/pdf")
async def export_pdf(user: dict = Depends(get_current_user)):
    """Generate Executive Summary PDF for managers and admins"""
    if user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can export PDF")
    
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    
    # Get data
    if user["role"] == "admin":
        all_goals = await db.goals.find({"deleted": {"$ne": True}}).to_list(10000)
        team_members = await db.users.find({"role": "employee"}, {"password_hash": 0}).to_list(1000)
        title = "Organization Executive Summary"
    else:
        team_members = await db.users.find({"manager_id": user["id"]}, {"password_hash": 0}).to_list(1000)
        team_ids = [str(m["_id"]) for m in team_members]
        all_goals = await db.goals.find({"user_id": {"$in": team_ids}, "deleted": {"$ne": True}}).to_list(10000)
        title = f"Team Executive Summary - {user['name']}"
    
    total_goals = len(all_goals)
    approved = len([g for g in all_goals if g.get("status") == "approved"])
    pending = len([g for g in all_goals if g.get("status") == "pending"])
    rework = len([g for g in all_goals if g.get("status") == "rework"])
    
    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch, leftMargin=0.6*inch, rightMargin=0.6*inch)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=22, textColor=colors.HexColor('#FF6B35'), spaceAfter=8, fontName='Helvetica-Bold')
    sub_style = ParagraphStyle('SubStyle', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#52525B'), spaceAfter=20)
    h2_style = ParagraphStyle('H2Style', parent=styles['Heading2'], fontSize=13, textColor=colors.HexColor('#0A0A0A'), spaceAfter=8, spaceBefore=12, fontName='Helvetica-Bold')
    
    story = []
    
    # Header
    story.append(Paragraph("GoalForge", title_style))
    story.append(Paragraph(f"<b>{title}</b><br/>Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y')}", sub_style))
    
    # KPI Summary table
    story.append(Paragraph("Key Performance Indicators", h2_style))
    kpi_data = [
        ["Metric", "Value"],
        ["Total Goals", str(total_goals)],
        ["Approved", f"{approved} ({round(approved/total_goals*100) if total_goals else 0}%)"],
        ["Pending Approval", str(pending)],
        ["In Rework", str(rework)],
        ["Team Size", str(len(team_members))],
    ]
    kpi_table = Table(kpi_data, colWidths=[3*inch, 3*inch])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6B35')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(kpi_table)
    
    # Department-wise breakdown
    story.append(Paragraph("Department Performance", h2_style))
    dept_stats = {}
    user_dept_map = {str(m["_id"]): m.get("department", "N/A") for m in team_members}
    for g in all_goals:
        dept = user_dept_map.get(g.get("user_id"), "Unknown")
        if dept not in dept_stats:
            dept_stats[dept] = {"total": 0, "approved": 0}
        dept_stats[dept]["total"] += 1
        if g.get("status") == "approved":
            dept_stats[dept]["approved"] += 1
    
    dept_rows = [["Department", "Total Goals", "Approved", "Completion %"]]
    for d, s in sorted(dept_stats.items()):
        pct = round(s["approved"] / s["total"] * 100) if s["total"] else 0
        dept_rows.append([d, str(s["total"]), str(s["approved"]), f"{pct}%"])
    
    dept_table = Table(dept_rows, colWidths=[2*inch, 1.3*inch, 1.3*inch, 1.4*inch])
    dept_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0038FF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(dept_table)
    
    # Top performers
    story.append(Paragraph("Top Performers", h2_style))
    top = sorted(team_members, key=lambda u: u.get("points", 0), reverse=True)[:10]
    perf_rows = [["Rank", "Employee", "Department", "Performance", "Points"]]
    for i, p in enumerate(top, 1):
        perf_rows.append([
            f"#{i}",
            p.get("name", ""),
            p.get("department", "N/A"),
            f"{p.get('performance_score', 0):.2f}",
            str(p.get("points", 0))
        ])
    
    perf_table = Table(perf_rows, colWidths=[0.6*inch, 2*inch, 1.5*inch, 1.2*inch, 0.7*inch])
    perf_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16A34A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(perf_table)
    
    # Footer
    story.append(Spacer(1, 30))
    footer_style = ParagraphStyle('FooterStyle', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#A1A1AA'), alignment=TA_CENTER)
    story.append(Paragraph("Generated by GoalForge • Forge Your Future • Confidential", footer_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=goalforge_executive_summary_{datetime.now().strftime('%Y%m%d')}.pdf"}
    )

api_router.include_router(analytics_router)

# Activity feed
activity_router = APIRouter(prefix="/activities", tags=["activities"])

@activity_router.get("")
async def get_activities(user: dict = Depends(get_current_user), limit: int = 50):
    activities = await db.activities.find().sort("timestamp", -1).limit(limit).to_list(limit)
    return [serialize_doc(a) for a in activities]

api_router.include_router(activity_router)

# Notifications
notif_router = APIRouter(prefix="/notifications", tags=["notifications"])

@notif_router.get("")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(n) for n in notifs]

@notif_router.post("/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"_id": ObjectId(notif_id), "user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "Marked as read"}

@notif_router.post("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"message": "All marked as read"}

api_router.include_router(notif_router)

# Goal templates
templates_router = APIRouter(prefix="/templates", tags=["templates"])

GOAL_TEMPLATES = [
    {"id": "sales-revenue", "category": "Sales", "title": "Increase Quarterly Revenue", "description": "Drive quarterly revenue growth through new customer acquisition and account expansion", "thrust_area": "Sales", "uom": "percentage", "target": "20", "metric_type": "higher_better", "icon": "TrendingUp"},
    {"id": "sales-conversion", "category": "Sales", "title": "Improve Lead Conversion Rate", "description": "Optimize sales funnel to improve conversion from MQL to closed-won", "thrust_area": "Sales", "uom": "percentage", "target": "15", "metric_type": "higher_better", "icon": "Target"},
    {"id": "eng-deployment", "category": "Engineering", "title": "Reduce Deployment Time", "description": "Streamline CI/CD pipeline to reduce deployment time", "thrust_area": "Engineering", "uom": "numeric", "target": "30", "metric_type": "lower_better", "icon": "Rocket"},
    {"id": "eng-bugs", "category": "Engineering", "title": "Reduce Production Bugs", "description": "Implement testing strategies to reduce production incidents", "thrust_area": "Engineering", "uom": "numeric", "target": "5", "metric_type": "lower_better", "icon": "Bug"},
    {"id": "hr-retention", "category": "HR", "title": "Improve Employee Retention", "description": "Implement retention programs to reduce voluntary attrition", "thrust_area": "HR", "uom": "percentage", "target": "10", "metric_type": "lower_better", "icon": "Users"},
    {"id": "hr-training", "category": "HR", "title": "Complete Team Training Programs", "description": "Ensure 100% completion of mandatory training across team", "thrust_area": "HR", "uom": "percentage", "target": "100", "metric_type": "higher_better", "icon": "GraduationCap"},
    {"id": "ops-cost", "category": "Operations", "title": "Reduce Operational Costs", "description": "Identify and eliminate operational inefficiencies", "thrust_area": "Operations", "uom": "percentage", "target": "12", "metric_type": "lower_better", "icon": "PiggyBank"},
    {"id": "ops-safety", "category": "Operations", "title": "Zero Safety Incidents", "description": "Maintain zero workplace safety incidents", "thrust_area": "Safety", "uom": "zero", "target": "0", "metric_type": "lower_better", "icon": "Shield"},
    {"id": "mkt-leads", "category": "Marketing", "title": "Generate Qualified Leads", "description": "Generate marketing qualified leads through campaigns", "thrust_area": "Marketing", "uom": "numeric", "target": "500", "metric_type": "higher_better", "icon": "Megaphone"},
    {"id": "mkt-brand", "category": "Marketing", "title": "Increase Brand Awareness", "description": "Grow social media following and brand mentions", "thrust_area": "Marketing", "uom": "percentage", "target": "25", "metric_type": "higher_better", "icon": "Sparkles"},
    {"id": "cs-csat", "category": "Customer Success", "title": "Improve Customer Satisfaction (CSAT)", "description": "Increase customer satisfaction scores through better service", "thrust_area": "Customer Success", "uom": "percentage", "target": "90", "metric_type": "higher_better", "icon": "Heart"},
    {"id": "cs-tat", "category": "Customer Success", "title": "Reduce Response Time (TAT)", "description": "Reduce average customer ticket response time", "thrust_area": "Customer Success", "uom": "numeric", "target": "2", "metric_type": "lower_better", "icon": "Clock"},
]

@templates_router.get("")
async def get_templates(user: dict = Depends(get_current_user)):
    return GOAL_TEMPLATES

api_router.include_router(templates_router)

# AI Goal Suggestions
ai_router = APIRouter(prefix="/ai", tags=["ai"])

@ai_router.post("/suggest-goals")
async def suggest_goals(input: AIGoalSuggestRequest, user: dict = Depends(get_current_user)):
    if LlmChat is None or UserMessage is None:
        raise HTTPException(status_code=503, detail="AI service is not available in this environment")
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"goal-suggest-{user['id']}-{datetime.now().timestamp()}",
            system_message="You are an expert HR consultant helping employees create SMART goals. Provide concise, actionable goal suggestions."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        prompt = f"""Suggest 3 SMART goals for a {input.role} in the {input.department} department.
{f'Focus area: {input.thrust_area}' if input.thrust_area else ''}

Return ONLY a JSON array with exactly 3 goals in this format:
[
  {{"title": "...", "description": "...", "thrust_area": "...", "uom": "numeric|percentage|timeline|zero", "target": "...", "metric_type": "higher_better|lower_better"}}
]

No additional text, just the JSON array."""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Extract JSON from response
        import json
        import re
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            suggestions = json.loads(json_match.group())
            return {"suggestions": suggestions}
        return {"suggestions": [], "raw": response}
    except Exception as e:
        logger.error(f"AI suggestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@ai_router.post("/enhance-description")
async def enhance_description(input: dict, user: dict = Depends(get_current_user)):
    if LlmChat is None or UserMessage is None:
        raise HTTPException(status_code=503, detail="AI service is not available in this environment")
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"enhance-{user['id']}-{datetime.now().timestamp()}",
            system_message="You are a writing assistant who improves goal descriptions to be more SMART (Specific, Measurable, Achievable, Relevant, Time-bound)."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        prompt = f"""Improve this goal description to make it more SMART and professional. Keep it under 200 words. Return ONLY the improved description, no preamble.

Original: {input.get('description', '')}
Title: {input.get('title', '')}"""
        
        response = await chat.send_message(UserMessage(text=prompt))
        return {"enhanced": response.strip()}
    except Exception as e:
        logger.error(f"AI enhance error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

api_router.include_router(ai_router)

# Users management
users_router = APIRouter(prefix="/users", tags=["users"])

@users_router.get("")
async def get_users(user: dict = Depends(get_current_user)):
    if user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    return [serialize_doc(u) for u in users]

api_router.include_router(users_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup events
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.goals.create_index("user_id")
    await db.checkins.create_index("goal_id")
    await db.notifications.create_index("user_id")
    await db.activities.create_index("timestamp")
    
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@goalforge.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        try:
            await db.users.insert_one({
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "name": "Admin User",
                "role": "admin",
                "department": "Management",
                "manager_id": None,
                "avatar_url": None,
                "points": 0,
                "badges": ["founder"],
                "created_at": datetime.now(timezone.utc)
            })
            logger.info(f"Admin user created: {admin_email}")
        except Exception as e:
            if "duplicate" in str(e).lower():
                logger.info(f"Admin user already exists: {admin_email}")
            else:
                raise
    
    manager_email = "manager@goalforge.com"
    existing_manager = await db.users.find_one({"email": manager_email})
    if not existing_manager:
        try:
            await db.users.insert_one({
                "email": manager_email,
                "password_hash": hash_password("Manager@123"),
                "name": "Sarah Johnson",
                "role": "manager",
                "department": "Engineering",
                "manager_id": None,
                "avatar_url": None,
                "points": 0,
                "badges": [],
                "created_at": datetime.now(timezone.utc)
            })
            logger.info("Manager user created")
        except Exception as e:
            if "duplicate" in str(e).lower():
                logger.info("Manager user already exists")
            else:
                raise
    
    manager = await db.users.find_one({"email": manager_email})
    manager_id = str(manager["_id"]) if manager else None
    
    employees = [
        {"email": "employee1@goalforge.com", "name": "Rajesh Kumar", "department": "Engineering"},
        {"email": "employee2@goalforge.com", "name": "Priya Sharma", "department": "Engineering"},
        {"email": "employee3@goalforge.com", "name": "Arjun Mehta", "department": "Sales"},
    ]
    
    for emp in employees:
        existing = await db.users.find_one({"email": emp["email"]})
        if not existing:
            try:
                await db.users.insert_one({
                    "email": emp["email"],
                    "password_hash": hash_password("Employee@123"),
                    "name": emp["name"],
                    "role": "employee",
                    "department": emp["department"],
                    "manager_id": manager_id,
                    "avatar_url": None,
                    "points": 0,
                    "badges": [],
                    "created_at": datetime.now(timezone.utc)
                })
                logger.info(f"Employee created: {emp['email']}")
            except Exception as e:
                if "duplicate" in str(e).lower():
                    logger.info(f"Employee already exists: {emp['email']}")
                else:
                    raise
    
    creds_content = f"""# Test Credentials for GoalForge Portal

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Manager Account
- Email: manager@goalforge.com
- Password: Manager@123
- Role: manager

## Employee Accounts
- Email: employee1@goalforge.com
- Password: Employee@123
- Role: employee

- Email: employee2@goalforge.com
- Password: Employee@123
- Role: employee

- Email: employee3@goalforge.com
- Password: Employee@123
- Role: employee

## Auth Endpoints
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/me
- POST /api/auth/logout
"""
    
    memory_dir = ROOT_DIR.parent / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)
    (memory_dir / "test_credentials.md").write_text(creds_content)
    logger.info("Test credentials saved")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
