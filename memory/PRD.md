# GoalForge - Goal Setting & Tracking Portal

## Original Problem Statement (AtomQuest Hackathon 2026)
Build an In-House Goal Setting & Tracking Portal that manages the complete employee goal lifecycle: creation, alignment, quarterly check-ins, and performance visibility. Must support 3 roles (Employee/Manager/Admin), goal validation (max 8 goals, 100% total weightage), 4 UoM types, approval workflow, quarterly check-ins (Q1-Q4), achievement tracking with progress score calculation, audit trails, and reporting.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async), JWT auth, bcrypt, Resend emails, Claude AI integration
- **Frontend**: React 19 + Tailwind + Shadcn UI + Recharts + React Router
- **Design**: Swiss/High-Contrast with orange flame theme (#FF6B35)
- **Deployment**: Supervisor-managed services, MongoDB Atlas-ready

## User Personas
1. **Employee** - Creates goals, logs check-ins, tracks progress
2. **Manager** - Reviews/approves team goals, conducts check-ins
3. **Admin/HR** - Org-wide oversight, analytics, audit trail

## Core Features Implemented (2026-05-17)
✅ JWT Authentication with httpOnly cookies (HTTPS-secure)
✅ Multi-role system (Employee/Manager/Admin)
✅ Goal creation with validation (max 8 goals, total weightage ≤ 100%, min 10% per goal)
✅ 4 UoM types: Numeric, Percentage, Timeline, Zero-based
✅ Manager approval workflow with inline editing
✅ Goal locking after approval (admin can unlock)
✅ Quarterly check-ins (Q1-Q4) with progress score calculation
✅ Smart progress calculation for higher/lower-better metrics
✅ Analytics dashboard with charts (QoQ trends, department-wise, distribution)
✅ Audit trail (admin-only)
✅ CSV export
✅ Email notifications (Resend)

## Bonus Features Implemented
✅ Beautiful Landing Page with marketing content
✅ AI-Powered Goal Suggestions (Claude Sonnet 4.5)
✅ 12+ Goal Templates Library (Sales, Engineering, HR, Operations, Marketing, Customer Success)
✅ Activity Feed - Real-time org activity stream
✅ Gamification System (points for goals/approvals/check-ins)
✅ Leaderboard with podium for top 3
✅ Notifications Center with bell icon
✅ Advanced Filters & Search on goals
✅ Mobile responsive design
✅ Quick demo login buttons

## Test Credentials (Pre-seeded)
- **Admin**: admin@goalforge.com / Admin@123
- **Manager**: manager@goalforge.com / Manager@123
- **Employees**: employee1/2/3@goalforge.com / Employee@123

## Tested & Verified (Iteration 2)
- 31/31 backend pytest tests PASSED (100%)
- Frontend Playwright validation 100% on tested flows
- All critical bugs from iteration 1 fixed

## P0/P1/P2 Backlog (Future)
- P1: Microsoft Entra ID (Azure AD) SSO integration
- P1: Teams bot/adaptive card notifications
- P1: Shared goals (push KPIs to multiple employees)
- P2: Escalation rules engine
- P2: Milestone tracking UI (backend exists)
- P2: Comment threads UI (backend exists)
- P2: Dark mode toggle
- P2: Goal templates - custom user-created templates

## API Endpoints (60+)
- /api/auth/* (register, login, logout, me)
- /api/goals/* (CRUD, approve, reject, unlock, comments, milestones)
- /api/checkins/* (create, history)
- /api/analytics/* (dashboard, completion-rates, qoq-trends, thrust-area, leaderboard, audit-trail, export/csv)
- /api/templates (12 pre-built)
- /api/ai/suggest-goals, /api/ai/enhance-description
- /api/activities, /api/notifications
- /api/users
