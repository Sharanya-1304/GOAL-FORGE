# GOAL-FORGE DEPLOYMENT CHECKLIST

## ✅ BACKEND STATUS - VERIFIED WORKING

**Framework**: FastAPI 2.0 (Python 3.11.9)
**Server File**: `backend/server.py`
**App Variable**: `app = FastAPI(title="GoalForge API", version="2.0")`
**API Base Path**: `/api/`
**Health Check Endpoint**: `GET /api/` → Returns `{"message": "GoalForge API v2.0", "status": "operational"}`

**Routes Configured**:
- ✅ Authentication (/api/auth/register, /api/auth/login, etc.)
- ✅ Goals management (/api/goals)
- ✅ Check-ins (/api/checkins)
- ✅ Analytics (/api/analytics)
- ✅ AI Integration (/api/ai)
- ✅ Users management (/api/users)

**Database**: MongoDB (Async with Motor)
**CORS**: Enabled for all origins (allows frontend communication)

---

## 📋 RENDER FORM - WHAT TO FILL

### Backend Service Setup:

**Name**: `goal-forge-backend` (pre-filled)
**Runtime**: `docker` (using Dockerfile)
**Dockerfile Path**: `backend/Dockerfile`
**Docker Context**: `.` (root of repo)
**Region**: `Oregon` (selected)
**Instance Type**: `Free` (for testing) or `Starter` (for production)

### Environment Variables (REQUIRED):

Fill in the Render Environment Variables section:

```
MONGO_URL = mongodb+srv://[YOUR_USERNAME]:[YOUR_PASSWORD]@[YOUR_CLUSTER].mongodb.net/goal_forge_db?retryWrites=true&w=majority
DB_NAME = goal_forge_db
JWT_SECRET = [GENERATE_A_LONG_RANDOM_STRING_50+_CHARS]
RESEND_API_KEY = re_[YOUR_RESEND_API_KEY]
SENDER_EMAIL = noreply@yourdomain.com
EMERGENT_LLM_KEY = [OPTIONAL_IF_USING_AI]
ADMIN_EMAIL = admin@goalforge.com
ADMIN_PASSWORD = [SET_A_SECURE_PASSWORD]
PORT = 5000
PYTHONUNBUFFERED = 1
```

---

## 📋 FRONTEND SERVICE SETUP:

**Name**: `goal-forge-frontend` (pre-filled)
**Runtime**: `docker` (using Dockerfile)
**Dockerfile Path**: `frontend/Dockerfile`
**Docker Context**: `.` (root of repo)
**Region**: `Oregon` (selected)
**Instance Type**: `Free` (for testing) or `Starter` (for production)

### Environment Variables:

```
NODE_ENV = production
REACT_APP_BACKEND_URL = https://goal-forge-backend.onrender.com
```

---

## 🔐 WHERE TO GET THESE VALUES:

1. **MONGO_URL**: MongoDB Atlas
   - Go to mongodb.com → Create cluster
   - Click "Connect" → Get connection string
   - Replace `<username>` and `<password>`

2. **JWT_SECRET**: Generate random
   - Use: `openssl rand -base64 64`
   - Or generate any 50+ character random string

3. **RESEND_API_KEY**: Resend.com
   - Sign up at resend.com
   - Go to API Keys
   - Copy your API key (starts with `re_`)

4. **SENDER_EMAIL**: Any email you own
   - Default: `noreply@yourdomain.com`
   - Or use: `onboarding@resend.dev` (Resend test email)

---

## ✅ BACKEND VERIFICATION CHECKLIST

- ✅ **server.py exists** and has FastAPI app
- ✅ **requirements.txt** has all dependencies (fastapi, uvicorn, motor, pydantic, jwt, bcrypt, resend, etc.)
- ✅ **Dockerfile** uses correct Python 3.11.9 base image
- ✅ **Environment variables** are properly loaded with `dotenv`
- ✅ **Database indexes** are created on startup
- ✅ **CORS middleware** is configured
- ✅ **All routers included**: auth, goals, checkins, analytics, ai, users
- ✅ **Health check endpoint** available at `/api/`
- ✅ **Error handling** implemented throughout
- ✅ **Async support** for all DB operations

---

## 🚀 DEPLOYMENT STEPS:

1. **Fill in environment variables** on Render for both services
2. **Set Instance Type** to `Free` initially (or `Starter` for production)
3. **Click "Create Web Service"** for each service
4. **Wait for builds** to complete (3-5 minutes)
5. **Check deployment logs** if there are issues
6. **Test endpoints**:
   - Backend: `https://goal-forge-backend.onrender.com/api/`
   - Frontend: `https://goal-forge-frontend.onrender.com/`

---

## 🔧 TROUBLESHOOTING:

**If backend fails to deploy**:
- Check MongoDB URI is correct
- Check JWT_SECRET is set and long enough
- Check all required env vars are filled
- Check logs for specific errors

**If frontend can't connect to backend**:
- Make sure `REACT_APP_BACKEND_URL` matches backend service URL
- Check CORS is enabled (it is by default)
- Check browser console for errors

---

## 📝 NOTES:

- Both services use Docker (no ambiguous path issues)
- Backend runs on port 5000
- Frontend runs on port 3000 (inside Docker, port 3000; externally on 443/80)
- All environment variables are stored securely in Render
- `.env` file is NOT committed to git (stays local only)

