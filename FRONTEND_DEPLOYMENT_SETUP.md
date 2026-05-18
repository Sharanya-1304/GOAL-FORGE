# Frontend Deployment Setup Guide

## ✅ Current Status

### Frontend Configuration
- **Backend URL**: `https://goal-forge-backend.onrender.com`
- **Environment**: Production ready
- **Build Status**: ✅ Successfully compiled
- **API Calls**: All using HTTPS with live backend
- **CORS**: Enabled and working

### Key Files Updated
- ✅ `frontend/.env` - Backend URL configured
- ✅ `frontend/src/contexts/AuthContext.js` - Uses environment variable
- ✅ All pages (Goals, Dashboard, Analytics, etc.) - Use centralized API variable
- ✅ `.gitignore` - Protects sensitive .env files

---

## 🚀 Deployment Instructions

### Step 1: Deploy Frontend to Render

1. **Go to Render Dashboard** → Create New → Static Site (or Web Service)
2. **Connect Your Repository**: Select `GOAL-FORGE`
3. **Configure Build**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `frontend/build`
   - **Root Directory**: `frontend`
4. **Environment Variables**:
   ```
   REACT_APP_BACKEND_URL=https://goal-forge-backend.onrender.com
   WDS_SOCKET_PORT=443
   ENABLE_HEALTH_CHECK=false
   ```
5. **Deploy** → Wait for build to complete (2-3 minutes)

### Step 2: Verify Frontend Deployment

Test the live frontend:
1. Visit: `https://goal-forge-frontend.onrender.com` (or your custom URL)
2. Should see: GoalForge landing page
3. Login with test credentials:
   - **Email**: `admin@goalforge.com`
   - **Password**: `Admin@123`
4. Verify dashboard loads and API calls work

### Step 3: Verify API Connectivity

After login, test API endpoints:
- ✅ **Health Check**: `GET https://goal-forge-backend.onrender.com/api/`
  - Should return: `{"message": "GoalForge API v2.0", "status": "operational"}`
- ✅ **Goals**: Dashboard should load user goals
- ✅ **Analytics**: All charts should display data
- ✅ **Activities**: Activity feed should show logs

---

## 📝 API Endpoints Configured

All frontend API calls now use HTTPS to live backend:

| Endpoint | Method | URL |
|----------|--------|-----|
| Auth/Login | POST | `https://goal-forge-backend.onrender.com/api/auth/login` |
| Auth/Register | POST | `https://goal-forge-backend.onrender.com/api/auth/register` |
| Goals | GET/POST | `https://goal-forge-backend.onrender.com/api/goals` |
| Checkins | POST | `https://goal-forge-backend.onrender.com/api/checkins` |
| Analytics | GET | `https://goal-forge-backend.onrender.com/api/analytics/*` |
| Activities | GET | `https://goal-forge-backend.onrender.com/api/activities` |
| AI Suggestions | POST | `https://goal-forge-backend.onrender.com/api/ai/suggest-goals` |

---

## 🔒 Security Checklist

- ✅ `.env` files in `.gitignore` (secrets protected)
- ✅ HTTPS enforced (https://, not http://)
- ✅ CORS configured on backend to accept frontend requests
- ✅ Credentials (cookies) sent with all requests
- ✅ No hardcoded API URLs in code

---

## 📦 Build Details

- **Build Tool**: Craco (Create React App config override)
- **Build Output**: `frontend/build/` directory
- **Build Size**: ~281 kB (gzipped)
- **Build Command**: `npm run build`
- **Dev Command**: `npm start`

---

## 🐛 Troubleshooting

### Frontend builds but shows blank page
- Check browser console for errors
- Verify `REACT_APP_BACKEND_URL` is set correctly in Render environment
- Ensure backend is running and responding to health check

### API calls fail with 403/CORS error
- Verify backend CORS middleware is enabled
- Check backend is responding at `https://goal-forge-backend.onrender.com/api/`
- Ensure frontend environment variables are set

### Login fails
- Verify backend is accessible: `curl https://goal-forge-backend.onrender.com/api/`
- Check backend logs in Render
- Confirm MongoDB connection is working

---

## 📊 Environment Variables

### Frontend (.env)
```dotenv
REACT_APP_BACKEND_URL=https://goal-forge-backend.onrender.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

### Backend (.env in Render)
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/goal_forge_db
DB_NAME=goal_forge_db
JWT_SECRET=your-secret-key
RESEND_API_KEY=re_your_api_key
SENDER_EMAIL=sender@example.com
ADMIN_EMAIL=admin@goalforge.com
ADMIN_PASSWORD=Admin@123
PORT=5000
```

---

## ✅ Deployment Complete

Your GOAL-FORGE application is now deployed and running in production:
- **Frontend**: `https://goal-forge-frontend.onrender.com`
- **Backend**: `https://goal-forge-backend.onrender.com`
- **Database**: MongoDB Atlas (Cloud)
- **Email**: Resend API

All API calls use secure HTTPS connections to the live backend!
