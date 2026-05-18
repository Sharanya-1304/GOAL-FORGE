# GOAL-FORGE Deployment Guide

## ✅ Deployment Setup Overview

Your project is configured for **Heroku** deployment with:
- **Backend**: Python FastAPI (via Gunicorn + Uvicorn)
- **Frontend**: React (built and served)
- **Database**: MongoDB (Atlas)
- **Multi-buildpack**: Python 3.11.9 + Node.js 20.11.0

---

## 📋 Prerequisites

1. **Heroku Account**: Create at https://www.heroku.com
2. **Heroku CLI**: Install from https://devcenter.heroku.com/articles/heroku-cli
3. **Git**: Already configured ✅
4. **MongoDB Atlas Account**: For database (https://www.mongodb.com/cloud/atlas)

---

## 🚀 Deployment Steps

### Step 1: Install Heroku CLI
```powershell
# Windows: Download and install from https://devcenter.heroku.com/articles/heroku-cli
# Or via Scoop/Chocolatey if you have them installed

# After installation, verify:
heroku --version
```

### Step 2: Login to Heroku
```powershell
heroku login
# Opens browser for authentication
```

### Step 3: Create Heroku App (if not already created)
```powershell
# Create new app
heroku create goal-forge-app

# Or connect to existing app
heroku git:remote -a your-existing-app-name
```

### Step 4: Set Environment Variables
```powershell
# Set MongoDB URI
heroku config:set MONGODB_URI=your_mongodb_atlas_connection_string

# Set JWT Secret
heroku config:set JWT_SECRET=your_secure_jwt_secret

# Set Resend API Key (for emails)
heroku config:set RESEND_API_KEY=your_resend_api_key

# Verify variables set:
heroku config
```

### Step 5: Deploy to Heroku
```powershell
# Push code to Heroku
git push heroku main

# This will:
# 1. Build Python dependencies (backend)
# 2. Build Node.js dependencies (frontend)
# 3. Build React frontend
# 4. Start FastAPI backend with Gunicorn + Uvicorn
```

### Step 6: View Logs (Troubleshooting)
```powershell
# Watch logs in real-time
heroku logs --tail

# View specific number of logs
heroku logs -n 50

# Restart app if needed
heroku restart
```

### Step 7: Verify Deployment
```powershell
# Check app status
heroku open

# Or visit: https://your-app-name.herokuapp.com
```

---

## 📦 What Gets Deployed

### Frontend
- React 19 application
- TailwindCSS styling
- Shadcn/UI components
- Built to `frontend/build/` directory
- Served alongside backend

### Backend
- FastAPI Python server
- MongoDB async operations (Motor)
- JWT authentication
- Email service (Resend)
- API routes for:
  - Authentication (login, register)
  - Goals (CRUD)
  - Check-ins (logging)
  - Analytics dashboard
  - Team management

---

## 🔧 Environment Variables Required

Create a `.env` file in the `backend/` directory:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# Authentication
JWT_SECRET=your_very_secure_random_string

# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Frontend URL (for CORS)
FRONTEND_URL=https://your-app-name.herokuapp.com

# Environment
ENV=production
```

---

## 🔒 Security Checklist

- [ ] Environment variables set in Heroku (not in code)
- [ ] `.env` file in `.gitignore` (DO NOT commit)
- [ ] JWT_SECRET is strong (50+ characters, random)
- [ ] CORS configured for your Heroku domain
- [ ] MongoDB Atlas IP whitelist includes Heroku dynos (0.0.0.0/0)
- [ ] HTTPS enabled (automatic with Heroku)

---

## 📝 Build & Run Files

### Procfile
Defines how Heroku runs your app:
```
web: cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app
```

### heroku.yml
Multi-buildpack configuration:
- Python 3.11.9 for backend
- Node.js 20.11.0 for frontend build

---

## 🐛 Troubleshooting

### Build Fails
```
heroku logs --tail
# Check for:
# - Missing dependencies in requirements.txt
# - Node.js build errors in frontend
# - Python version compatibility
```

### App Crashes After Deploy
```
# Check logs for errors
heroku logs -n 100

# Restart app
heroku restart

# Check Procfile syntax
cat Procfile
```

### Database Connection Failed
```
# Verify MongoDB URI is set
heroku config:get MONGODB_URI

# Check MongoDB Atlas firewall allows Heroku IPs
# Add 0.0.0.0/0 to Network Access in MongoDB Atlas
```

### Frontend Not Loading
```
# Check if frontend/build exists
# If not, Node.js build failed during deploy
# Verify package.json and build scripts

# Local test build:
cd frontend
npm run build
```

---

## 📊 Monitoring

After deployment, monitor your app:

```powershell
# View real-time logs
heroku logs --tail

# Check app metrics
heroku apps:info

# Check Dyno status
heroku ps

# View recent deployments
heroku releases
```

---

## 🔄 Redeployment

After making changes:

```powershell
# Commit changes
git add .
git commit -m "your commit message"

# Push to Heroku
git push heroku main

# View deployment logs
heroku logs --tail
```

---

## 📞 Need Help?

1. **Heroku Docs**: https://devcenter.heroku.com/
2. **FastAPI Docs**: https://fastapi.tiangolo.com/
3. **React Docs**: https://react.dev/
4. **MongoDB Atlas**: https://docs.atlas.mongodb.com/

