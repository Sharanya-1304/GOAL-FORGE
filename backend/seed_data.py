"""
Seed database with realistic employee performance and HR data
Inspired by Kaggle datasets: Employee Performance Data & HR Data Set
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import os
import random
import bcrypt
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


# Realistic employee data inspired by Kaggle datasets
DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Operations", "HR", "Finance", "Customer Success", "Product"]

EMPLOYEE_NAMES = [
    ("Rajesh Kumar", "Engineering"), ("Priya Sharma", "Engineering"), ("Arjun Mehta", "Sales"),
    ("Sneha Patel", "Marketing"), ("Vikram Singh", "Engineering"), ("Anita Desai", "HR"),
    ("Karthik Reddy", "Operations"), ("Meera Nair", "Finance"), ("Rohan Joshi", "Engineering"),
    ("Divya Iyer", "Customer Success"), ("Aditya Verma", "Sales"), ("Neha Gupta", "Marketing"),
    ("Sanjay Malhotra", "Engineering"), ("Pooja Reddy", "Product"), ("Amit Khanna", "Sales"),
    ("Ritu Bansal", "HR"), ("Sandeep Chopra", "Operations"), ("Kavita Rao", "Finance"),
    ("Vivek Saxena", "Engineering"), ("Shreya Pillai", "Customer Success"), ("Manish Tiwari", "Product"),
    ("Anjali Menon", "Marketing"), ("Rahul Agarwal", "Engineering"), ("Sunita Kapoor", "Sales"),
    ("Deepak Mishra", "Operations"), ("Lakshmi Krishnan", "HR"), ("Nikhil Bose", "Finance"),
    ("Aishwarya Pandey", "Product"), ("Suresh Yadav", "Engineering"), ("Tanvi Bhatt", "Marketing"),
    ("Rakesh Gowda", "Sales"), ("Kiran Datta", "Customer Success"), ("Mohit Anand", "Engineering"),
    ("Preeti Sharma", "HR"), ("Gaurav Rastogi", "Operations"), ("Smita Bhatt", "Finance"),
    ("Akash Chaudhary", "Product"), ("Reema Khanna", "Marketing"), ("Pranav Sethi", "Sales"),
    ("Nandini Vaidya", "Engineering"),
]

MANAGERS = [
    ("Sarah Johnson", "Engineering"),
    ("David Chen", "Sales"),
    ("Maria Rodriguez", "Marketing"),
    ("James Wilson", "Operations"),
    ("Linda Anderson", "HR"),
    ("Robert Taylor", "Finance"),
    ("Jennifer Lee", "Customer Success"),
    ("Michael Brown", "Product"),
]

GOAL_TEMPLATES_BY_DEPT = {
    "Engineering": [
        ("Reduce Deployment Time", "Streamline CI/CD pipeline to reduce avg deployment time from 60 to 20 minutes", "numeric", "20", "lower_better", "Engineering Excellence"),
        ("Improve Code Coverage", "Achieve 80% test coverage across all production services", "percentage", "80", "higher_better", "Code Quality"),
        ("Reduce Production Incidents", "Cut down P0/P1 incidents through better monitoring", "numeric", "3", "lower_better", "Reliability"),
        ("Ship Major Features", "Deliver 4 major features as per product roadmap", "numeric", "4", "higher_better", "Product Delivery"),
        ("Improve API Performance", "Reduce P95 API response time", "numeric", "200", "lower_better", "Performance"),
    ],
    "Sales": [
        ("Increase Quarterly Revenue", "Drive new business and account expansion", "percentage", "25", "higher_better", "Revenue Growth"),
        ("Improve Lead Conversion", "Optimize sales funnel MQL to SQL conversion", "percentage", "18", "higher_better", "Sales Efficiency"),
        ("Expand Enterprise Accounts", "Sign 5 new enterprise deals", "numeric", "5", "higher_better", "Enterprise Growth"),
        ("Reduce Sales Cycle", "Decrease average deal closure time", "numeric", "45", "lower_better", "Sales Velocity"),
    ],
    "Marketing": [
        ("Generate Qualified Leads", "MQLs through inbound campaigns", "numeric", "800", "higher_better", "Lead Generation"),
        ("Increase Brand Awareness", "Grow social engagement and mentions", "percentage", "30", "higher_better", "Brand Building"),
        ("Improve Content ROI", "Increase content-driven conversions", "percentage", "20", "higher_better", "Content Marketing"),
        ("Reduce CAC", "Optimize paid acquisition costs", "percentage", "15", "lower_better", "Marketing Efficiency"),
    ],
    "HR": [
        ("Improve Employee Retention", "Reduce voluntary attrition rate", "percentage", "8", "lower_better", "Retention"),
        ("Complete Training Programs", "100% mandatory training completion", "percentage", "100", "higher_better", "Learning & Development"),
        ("Hire Key Positions", "Fill 15 critical roles within target timeline", "numeric", "15", "higher_better", "Talent Acquisition"),
        ("Improve eNPS Score", "Raise employee net promoter score", "numeric", "50", "higher_better", "Employee Experience"),
    ],
    "Operations": [
        ("Reduce Operational Costs", "Identify and eliminate inefficiencies", "percentage", "12", "lower_better", "Cost Optimization"),
        ("Improve Process Efficiency", "Cut down task TAT through automation", "percentage", "25", "lower_better", "Process Excellence"),
        ("Zero Safety Incidents", "Maintain zero workplace incidents", "zero", "0", "lower_better", "Safety"),
    ],
    "Finance": [
        ("Reduce Month-end Close Time", "Faster financial reporting cycle", "numeric", "5", "lower_better", "Reporting Efficiency"),
        ("Improve Forecast Accuracy", "Better budget vs actual variance", "percentage", "95", "higher_better", "Financial Planning"),
        ("Cost Savings Initiative", "Identify cost-saving opportunities", "numeric", "50", "higher_better", "Cost Management"),
    ],
    "Customer Success": [
        ("Improve CSAT Score", "Customer satisfaction through better service", "percentage", "92", "higher_better", "Customer Satisfaction"),
        ("Reduce Response Time", "Cut down ticket TAT", "numeric", "2", "lower_better", "Support Efficiency"),
        ("Increase NRR", "Net revenue retention through expansion", "percentage", "115", "higher_better", "Customer Retention"),
        ("Reduce Churn", "Lower customer churn rate", "percentage", "5", "lower_better", "Retention"),
    ],
    "Product": [
        ("Launch Major Features", "Ship roadmap features on time", "numeric", "6", "higher_better", "Product Delivery"),
        ("Improve User Adoption", "Grow active user engagement", "percentage", "35", "higher_better", "User Engagement"),
        ("Reduce Time-to-Value", "Improve new user activation", "percentage", "40", "lower_better", "Product Activation"),
    ],
}


async def seed_database():
    print("Clearing existing data (except admin)...")
    
    # Keep only the admin and base test accounts, clear everything else
    await db.users.delete_many({"email": {"$nin": ["admin@goalforge.com"]}})
    await db.goals.delete_many({})
    await db.checkins.delete_many({})
    await db.activities.delete_many({})
    await db.notifications.delete_many({})
    await db.audit_logs.delete_many({})
    await db.comments.delete_many({})
    await db.milestones.delete_many({})
    
    print("Creating managers...")
    manager_ids = {}
    for name, dept in MANAGERS:
        email = name.lower().replace(" ", ".") + "@goalforge.com"
        hire_date = datetime.now(timezone.utc) - timedelta(days=random.randint(730, 2190))  # 2-6 years
        result = await db.users.insert_one({
            "email": email,
            "password_hash": hash_password("Manager@123"),
            "name": name,
            "role": "manager",
            "department": dept,
            "manager_id": None,
            "avatar_url": None,
            "points": random.randint(150, 500),
            "badges": ["leader", "veteran"],
            "hire_date": hire_date,
            "salary": random.randint(120000, 180000),
            "performance_score": round(random.uniform(3.5, 5.0), 2),
            "engagement_score": round(random.uniform(70, 95), 2),
            "satisfaction_score": round(random.uniform(70, 95), 2),
            "years_at_company": (datetime.now(timezone.utc) - hire_date).days // 365,
            "recruitment_source": random.choice(["LinkedIn", "Referral", "Naukri", "Direct"]),
            "created_at": hire_date
        })
        manager_ids[dept] = str(result.inserted_id)
    
    # Set up demo manager for convenience
    sarah_id = manager_ids.get("Engineering")
    
    print("Creating employees...")
    employee_ids = {}
    GENDERS = ["Male", "Female"]
    MARITAL = ["Single", "Married", "Divorced"]
    POSITIONS = ["Junior", "Mid-level", "Senior", "Lead"]
    
    for i, (name, dept) in enumerate(EMPLOYEE_NAMES):
        email = f"emp{i+1}@goalforge.com"
        hire_date = datetime.now(timezone.utc) - timedelta(days=random.randint(90, 1825))
        years = (datetime.now(timezone.utc) - hire_date).days // 365
        result = await db.users.insert_one({
            "email": email,
            "password_hash": hash_password("Employee@123"),
            "name": name,
            "role": "employee",
            "department": dept,
            "manager_id": manager_ids.get(dept),
            "avatar_url": None,
            "points": random.randint(0, 350),
            "badges": [],
            "hire_date": hire_date,
            "salary": random.randint(45000, 110000),
            "performance_score": round(random.uniform(2.5, 5.0), 2),
            "engagement_score": round(random.uniform(50, 95), 2),
            "satisfaction_score": round(random.uniform(45, 95), 2),
            "years_at_company": years,
            "recruitment_source": random.choice(["LinkedIn", "Referral", "Naukri", "Indeed", "Direct", "Campus"]),
            "projects_count": random.randint(2, 12),
            "absence_days": random.randint(0, 15),
            "training_hours": random.randint(10, 80),
            "promotion_eligible": random.choice([True, False, False, False]),
            "attrition_risk": random.choice(["low", "low", "low", "medium", "medium", "high"]),
            "gender": random.choice(GENDERS),
            "marital_status": random.choice(MARITAL),
            "position_level": random.choice(POSITIONS),
            "age": random.randint(23, 55),
            "created_at": hire_date
        })
        employee_ids[name] = str(result.inserted_id)

    # Also seed the legacy demo accounts
    legacy_emps = [
        ("manager@goalforge.com", "Sarah Johnson Legacy", "manager", "Engineering"),
        ("employee1@goalforge.com", "Rajesh Kumar (Demo)", "employee", "Engineering"),
        ("employee2@goalforge.com", "Priya Sharma (Demo)", "employee", "Engineering"),
        ("employee3@goalforge.com", "Arjun Mehta (Demo)", "employee", "Sales"),
    ]
    for email, name, role, dept in legacy_emps:
        existing = await db.users.find_one({"email": email})
        if not existing:
            hire_date = datetime.now(timezone.utc) - timedelta(days=random.randint(365, 1095))
            result = await db.users.insert_one({
                "email": email,
                "password_hash": hash_password("Manager@123" if role == "manager" else "Employee@123"),
                "name": name,
                "role": role,
                "department": dept,
                "manager_id": manager_ids.get(dept) if role == "employee" else None,
                "avatar_url": None,
                "points": random.randint(50, 200),
                "badges": [],
                "hire_date": hire_date,
                "salary": random.randint(60000, 150000),
                "performance_score": round(random.uniform(3.0, 5.0), 2),
                "engagement_score": round(random.uniform(60, 90), 2),
                "satisfaction_score": round(random.uniform(60, 90), 2),
                "years_at_company": (datetime.now(timezone.utc) - hire_date).days // 365,
                "recruitment_source": "Demo",
                "created_at": hire_date
            })
            employee_ids[name] = str(result.inserted_id)

    print(f"Total users created: {len(MANAGERS)} managers + {len(EMPLOYEE_NAMES)} employees + legacy")
    
    print("Creating goals...")
    goal_count = 0
    employees_list = await db.users.find({"role": "employee"}).to_list(1000)
    
    for employee in employees_list:
        dept = employee.get("department", "Engineering")
        templates = GOAL_TEMPLATES_BY_DEPT.get(dept, GOAL_TEMPLATES_BY_DEPT["Engineering"])
        # Each employee gets 3-6 goals
        num_goals = random.randint(3, 6)
        selected_templates = random.sample(templates, min(num_goals, len(templates)))
        
        # Distribute weightage so total is exactly 100
        weights = []
        remaining = 100
        for i in range(len(selected_templates)):
            if i == len(selected_templates) - 1:
                weights.append(remaining)
            else:
                max_w = remaining - (len(selected_templates) - 1 - i) * 10
                w = random.randint(10, min(40, max_w))
                weights.append(w)
                remaining -= w
        
        for idx, (title, desc, uom, target, metric_type, thrust_area) in enumerate(selected_templates):
            status = random.choices(
                ["approved", "approved", "approved", "pending", "rework"],
                weights=[60, 60, 60, 25, 15]
            )[0]
            
            created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(7, 330))
            
            goal_doc = {
                "user_id": str(employee["_id"]),
                "user_name": employee["name"],
                "thrust_area": thrust_area,
                "title": title,
                "description": desc,
                "uom": uom,
                "target": target,
                "weightage": weights[idx],
                "metric_type": metric_type,
                "priority": random.choice(["low", "medium", "medium", "high", "high"]),
                "tags": [],
                "status": status,
                "locked": status == "approved",
                "shared_from": None,
                "created_at": created_at,
                "deleted": False
            }
            
            if status == "rework":
                goal_doc["rejection_reason"] = random.choice([
                    "Target seems too aggressive, please revise",
                    "Add more measurable outcomes",
                    "Align with department OKRs",
                    "Break this down into smaller goals"
                ])
            
            result = await db.goals.insert_one(goal_doc)
            goal_count += 1
            
            # Create check-ins for approved goals
            if status == "approved":
                num_checkins = random.randint(1, 3)
                for q_idx in range(num_checkins):
                    quarter = ["Q1", "Q2", "Q3", "Q4"][q_idx]
                    
                    # Realistic progress based on performance score
                    perf = employee.get("performance_score", 3.5)
                    base_progress = (perf / 5) * 100
                    progress_score = min(100, max(0, base_progress + random.uniform(-20, 15)))
                    
                    # Generate actual achievement
                    try:
                        target_val = float(target)
                        if metric_type == "higher_better":
                            actual = target_val * (progress_score / 100)
                        else:
                            actual = target_val * (100 / max(progress_score, 1))
                        actual_str = f"{round(actual, 1)}"
                    except:
                        actual_str = "Completed"
                    
                    checkin_status = "completed" if progress_score >= 90 else "on_track" if progress_score >= 50 else "not_started"
                    
                    await db.checkins.insert_one({
                        "goal_id": str(result.inserted_id),
                        "goal_title": title,
                        "user_id": str(employee["_id"]),
                        "quarter": quarter,
                        "actual_achievement": actual_str,
                        "status": checkin_status,
                        "progress_score": round(progress_score, 2),
                        "manager_comment": random.choice([
                            "", "", "", "Great work, keep it up!",
                            "On track, let's review next month",
                            "Need to accelerate efforts here",
                            "Excellent progress!",
                            "Consider revisiting the approach"
                        ]),
                        "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 300))
                    })
    
    print(f"Total goals created: {goal_count}")
    
    print("Creating activity logs...")
    all_users = await db.users.find({}).to_list(1000)
    for _ in range(80):
        user = random.choice(all_users)
        action = random.choice(["created", "approved", "checked-in", "updated", "rejected"])
        descriptions = {
            "created": ["Created goal: Increase Revenue 25%", "Created goal: Improve Code Coverage", "Created goal: Reduce Production Bugs"],
            "approved": ["Approved: Quarterly Revenue Goal", "Approved: Engineering Excellence", "Approved: Customer Satisfaction"],
            "checked-in": ["Q1: on_track (75.5%)", "Q2: completed (95.0%)", "Q1: on_track (62.3%)"],
            "updated": ["Updated goal target", "Modified weightage", "Updated description"],
            "rejected": ["Returned for rework: Target too aggressive", "Returned for rework: Add measurable outcomes"]
        }
        await db.activities.insert_one({
            "user_id": str(user["_id"]),
            "user_name": user["name"],
            "action": action,
            "entity_type": "goal",
            "entity_id": "demo",
            "description": random.choice(descriptions[action]),
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 720))
        })
    
    print("Creating audit logs...")
    for _ in range(40):
        user = random.choice(all_users)
        await db.audit_logs.insert_one({
            "entity_type": "goal",
            "entity_id": "demo",
            "action": random.choice(["updated", "approved", "rejected"]),
            "user_id": str(user["_id"]),
            "user_name": user["name"],
            "changes": {"weightage": random.randint(15, 50), "target": str(random.randint(50, 200))},
            "timestamp": datetime.now(timezone.utc) - timedelta(days=random.randint(0, 60))
        })

    print("=" * 50)
    print("✓ Database seeded successfully!")
    print(f"  - {len(MANAGERS)} managers")
    print(f"  - {len(EMPLOYEE_NAMES)} employees")
    print(f"  - {goal_count} goals")
    print(f"  - 80 activity logs")
    print(f"  - 40 audit logs")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed_database())
