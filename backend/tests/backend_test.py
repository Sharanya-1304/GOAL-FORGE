"""Backend API tests for GoalForge Goal Tracking Portal."""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hackdash-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@goalforge.com", "password": "Admin@123"}
MANAGER = {"email": "manager@goalforge.com", "password": "Manager@123"}
EMP1 = {"email": "employee1@goalforge.com", "password": "Employee@123"}


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s, r.json()


# --- AUTH ---
class TestAuth:
    def test_login_admin(self):
        s, data = _login(**ADMIN)
        assert data["email"] == ADMIN["email"]
        assert data["role"] == "admin"
        assert "access_token" in s.cookies

    def test_login_manager(self):
        _, data = _login(**MANAGER)
        assert data["role"] == "manager"

    def test_login_employee(self):
        _, data = _login(**EMP1)
        assert data["role"] == "employee"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "x@x.com", "password": "bad"})
        assert r.status_code == 401

    def test_me(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == EMP1["email"]
        assert "id" in r.json()

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self):
        s, _ = _login(**EMP1)
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": "admin@goalforge.com", "password": "x", "name": "x"
        })
        assert r.status_code == 400


# --- GOALS ---
class TestGoals:
    def test_create_and_list_goal_returns_id(self):
        s, _ = _login(**EMP1)
        payload = {
            "thrust_area": "TEST_Engineering",
            "title": f"TEST_Goal_{uuid.uuid4().hex[:6]}",
            "description": "Test goal",
            "uom": "numeric",
            "target": "100",
            "weightage": 25,
            "metric_type": "higher_better"
        }
        r = s.post(f"{API}/goals", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["title"] == payload["title"]
        assert created["status"] == "pending"
        assert "id" in created, f"Goal must return 'id' field, got: {created}"
        assert "_id" not in created
        goal_id = created["id"]

        # GET list to verify persistence and that 'id' is returned in listing
        r2 = s.get(f"{API}/goals")
        assert r2.status_code == 200
        goals_list = r2.json()
        assert all("id" in g for g in goals_list), "All goals in list must have 'id' field"
        assert goal_id in [g["id"] for g in goals_list]

        # GET single goal
        r3 = s.get(f"{API}/goals/{goal_id}")
        assert r3.status_code == 200
        assert r3.json()["id"] == goal_id

    def test_weightage_validation_too_low(self):
        s, _ = _login(**EMP1)
        r = s.post(f"{API}/goals", json={
            "thrust_area": "X", "title": "TEST_lowwt", "description": "x",
            "uom": "numeric", "target": "1", "weightage": 5
        })
        assert r.status_code == 422

    def test_weightage_validation_too_high(self):
        s, _ = _login(**EMP1)
        r = s.post(f"{API}/goals", json={
            "thrust_area": "X", "title": "TEST_highwt", "description": "x",
            "uom": "numeric", "target": "1", "weightage": 150
        })
        assert r.status_code == 422

    def test_team_goals_employee_forbidden(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/goals/team")
        assert r.status_code == 403

    def test_team_goals_manager_returns_ids(self):
        s, _ = _login(**MANAGER)
        r = s.get(f"{API}/goals/team")
        assert r.status_code == 200
        team_goals = r.json()
        assert isinstance(team_goals, list)
        if team_goals:
            assert all("id" in g for g in team_goals), "Team goals must have 'id' field"

    def test_approve_reject_flow(self):
        # Employee creates goal
        s_emp, _ = _login(**EMP1)
        payload = {
            "thrust_area": "TEST_AR",
            "title": f"TEST_AppReject_{uuid.uuid4().hex[:6]}",
            "description": "approval test",
            "uom": "numeric", "target": "10", "weightage": 15,
        }
        r = s_emp.post(f"{API}/goals", json=payload)
        assert r.status_code == 200
        goal_id = r.json()["id"]

        # Manager rejects with JSON body
        s_mgr, _ = _login(**MANAGER)
        r_rej = s_mgr.post(f"{API}/goals/{goal_id}/reject", json={"reason": "Needs more detail"})
        assert r_rej.status_code == 200, r_rej.text

        # Verify status is 'rework'
        r_get = s_emp.get(f"{API}/goals/{goal_id}")
        assert r_get.json()["status"] == "rework"

        # Create another goal to approve
        payload2 = {**payload, "title": f"TEST_App_{uuid.uuid4().hex[:6]}"}
        r2 = s_emp.post(f"{API}/goals", json=payload2)
        goal_id2 = r2.json()["id"]
        r_app = s_mgr.post(f"{API}/goals/{goal_id2}/approve")
        assert r_app.status_code == 200

        # Verify status is approved + locked
        r_get2 = s_emp.get(f"{API}/goals/{goal_id2}")
        assert r_get2.json()["status"] == "approved"
        assert r_get2.json()["locked"] is True

    def test_reject_requires_reason_in_json_body(self):
        # Test that endpoint accepts JSON body (not query param)
        s_emp, _ = _login(**EMP1)
        p = {
            "thrust_area": "X", "title": f"TEST_RJ_{uuid.uuid4().hex[:6]}",
            "description": "x", "uom": "numeric", "target": "5", "weightage": 12
        }
        gid = s_emp.post(f"{API}/goals", json=p).json()["id"]
        s_mgr, _ = _login(**MANAGER)
        # Missing reason → 422
        r = s_mgr.post(f"{API}/goals/{gid}/reject", json={})
        assert r.status_code == 422


# --- CHECKINS ---
class TestCheckIns:
    def test_checkin_progress_score(self):
        s, _ = _login(**EMP1)
        gp = {
            "thrust_area": "TEST_Eng", "title": f"TEST_CK_{uuid.uuid4().hex[:6]}",
            "description": "x", "uom": "numeric", "target": "100",
            "weightage": 20, "metric_type": "higher_better"
        }
        cr = s.post(f"{API}/goals", json=gp)
        assert cr.status_code == 200
        goal_id = cr.json()["id"]
        assert goal_id

        ck = {"quarter": "Q1", "actual_achievement": "50", "status": "on_track"}
        r = s.post(f"{API}/checkins/{goal_id}", json=ck)
        assert r.status_code == 200, r.text
        assert r.json()["progress_score"] == 50.0

        # Get checkins for this goal
        rc = s.get(f"{API}/checkins/goal/{goal_id}")
        assert rc.status_code == 200
        assert len(rc.json()) >= 1


# --- ANALYTICS ---
class TestAnalytics:
    def test_dashboard_admin(self):
        s, _ = _login(**ADMIN)
        r = s.get(f"{API}/analytics/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert "total_users" in d and "total_goals" in d

    def test_dashboard_manager(self):
        s, _ = _login(**MANAGER)
        r = s.get(f"{API}/analytics/dashboard")
        assert r.status_code == 200
        assert "team_goals" in r.json()

    def test_dashboard_employee(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/analytics/dashboard")
        assert r.status_code == 200
        assert "my_goals" in r.json()

    def test_completion_rates(self):
        s, _ = _login(**ADMIN)
        r = s.get(f"{API}/analytics/completion-rates")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_qoq_trends(self):
        s, _ = _login(**ADMIN)
        r = s.get(f"{API}/analytics/qoq-trends")
        assert r.status_code == 200
        assert len(r.json()) == 4

    def test_thrust_area_distribution(self):
        s, _ = _login(**ADMIN)
        r = s.get(f"{API}/analytics/thrust-area-distribution")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_leaderboard(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/analytics/leaderboard")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_audit_trail_admin(self):
        s, _ = _login(**ADMIN)
        r = s.get(f"{API}/analytics/audit-trail")
        assert r.status_code == 200

    def test_audit_trail_employee_forbidden(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/analytics/audit-trail")
        assert r.status_code == 403

    def test_csv_export_manager(self):
        s, _ = _login(**MANAGER)
        r = s.get(f"{API}/analytics/export/csv")
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert "Employee" in r.text  # header

    def test_csv_export_employee_forbidden(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/analytics/export/csv")
        assert r.status_code == 403


# --- TEMPLATES ---
class TestTemplates:
    def test_templates_returns_12(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/templates")
        assert r.status_code == 200
        templates = r.json()
        assert len(templates) >= 12
        for t in templates:
            assert "title" in t and "category" in t and "uom" in t


# --- ACTIVITIES & NOTIFICATIONS ---
class TestActivitiesNotifications:
    def test_activities_feed(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/activities")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_notifications(self):
        s, _ = _login(**EMP1)
        r = s.get(f"{API}/notifications")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_mark_all_read(self):
        s, _ = _login(**EMP1)
        r = s.post(f"{API}/notifications/read-all")
        assert r.status_code == 200
