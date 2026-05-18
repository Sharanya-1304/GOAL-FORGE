# Heroku Deployment Guide

## Prerequisites
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Heroku account (free tier available at heroku.com)
- Git initialized in your project

## Environment Variables Required

Before deploying, you'll need to set these environment variables in Heroku:

```bash
MONGO_URL          # MongoDB connection string
DB_NAME            # Database name
JWT_SECRET         # Secret key for JWT tokens
RESEND_API_KEY     # API key from Resend (email service)
SENDER_EMAIL       # Email address for sending emails
EMERGENT_LLM_KEY   # API key for Emergent integrations (if needed)
PORT               # (Optional, defaults to 5000)
```

## Deployment Steps

### 1. Login to Heroku
```bash
heroku login
```

### 2. Create a new Heroku app
```bash
heroku create your-app-name
```

### 3. Set environment variables
```bash
heroku config:set MONGO_URL="your_mongo_url" \
  DB_NAME="your_db_name" \
  JWT_SECRET="your_jwt_secret" \
  RESEND_API_KEY="your_resend_key" \
  SENDER_EMAIL="your_sender_email@example.com" \
  EMERGENT_LLM_KEY="your_llm_key"
```

Or set them individually:
```bash
heroku config:set MONGO_URL="your_mongo_url"
heroku config:set JWT_SECRET="your_jwt_secret"
# ... etc
```

### 4. Deploy
```bash
git push heroku main
```

(If your main branch is named differently, replace `main` with your branch name)

### 5. View logs
```bash
heroku logs --tail
```

## File Structure

- **Procfile**: Defines how Heroku runs your app
- **runtime.txt**: Specifies Python version
- **heroku.yml**: Multi-buildpack configuration for Node.js (frontend) and Python (backend)

## Frontend Static Files

The frontend build files should be served by the backend. Update your FastAPI app to serve static files:

```python
from fastapi.staticfiles import StaticFiles

# After creating FastAPI app
app.mount("/", StaticFiles(directory="../frontend/build", html=True), name="static")
```

Then build the frontend before deploying:

```bash
cd frontend
npm install
npm run build
cd ..
```

## Troubleshooting

### Port Issue
Heroku assigns a dynamic PORT. Make sure your FastAPI app uses:
```python
import os
port = int(os.environ.get("PORT", 5000))
```

### Build Failures
Check logs: `heroku logs --tail`

### Database Connection
Ensure MONGO_URL is correct and IP allowlist includes Heroku's IP addresses (typically use 0.0.0.0/0 for development)

### CORS Issues
Make sure your FastAPI CORS middleware includes your Heroku URL:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app-name.herokuapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Backend Only vs Full Stack

Currently configured for:
- Backend running on Heroku dyno
- Frontend should be built and served by the backend OR deployed separately

For separate deployment:
- Deploy backend to Heroku
- Deploy frontend to Vercel/Netlify (update API URLs)
