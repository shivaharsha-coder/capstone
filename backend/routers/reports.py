from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
import models
from auth import (
    get_current_user,
    get_current_faculty,
    get_current_student,
)

router = APIRouter(prefix="/api/reports", tags=["Reports & Dashboard Stats"])


@router.get("/dashboard/faculty")
def get_faculty_dashboard_stats(
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    today_str = date.today().isoformat()

    # 1. Total students
    total_students = db.query(models.Student).count()

    # 2. Today's attendance
    today_records = db.query(models.Attendance).filter(models.Attendance.date == today_str).all()
    present_count = len([r for r in today_records if r.status in ("Present", "Late")])
    attendance_pct = round((present_count / total_students * 100.0), 1) if total_students > 0 else 0.0

    # 3. Pending assignments to grade
    submissions = db.query(models.Submission).filter(models.Submission.marks_obtained == None).all()
    pending_submissions = len(submissions)

    # 4. Upcoming / active assessments
    upcoming_assessments = db.query(models.Assessment).filter(models.Assessment.is_published == True).count()

    # 5. Recent announcements (top 3)
    recent_announcements = (
        db.query(models.Announcement)
        .order_by(models.Announcement.created_at.desc())
        .limit(3)
        .all()
    )

    # 6. Recent classroom activities (attendance events + submissions + monitoring alerts)
    recent_activities = []
    recent_att = (
        db.query(models.Attendance)
        .order_by(models.Attendance.timestamp.desc())
        .limit(5)
        .all()
    )
    for a in recent_att:
        recent_activities.append({
            "type": "ATTENDANCE",
            "title": f"Attendance recorded: {a.student.user.full_name}",
            "description": f"Status: {a.status} ({round(a.confidence * 100, 1)}% confidence, {a.method})",
            "time": a.timestamp.strftime("%I:%M %p"),
            "timestamp": a.timestamp.isoformat()
        })

    recent_subs = (
        db.query(models.Submission)
        .order_by(models.Submission.submitted_at.desc())
        .limit(5)
        .all()
    )
    for s in recent_subs:
        recent_activities.append({
            "type": "SUBMISSION",
            "title": f"Assignment submitted: {s.student.user.full_name}",
            "description": f"'{s.assignment.title}' submitted",
            "time": s.submitted_at.strftime("%I:%M %p"),
            "timestamp": s.submitted_at.isoformat()
        })

    recent_activities.sort(key=lambda x: x["timestamp"], reverse=True)

    # 7. Past 7 days attendance trend for Recharts
    trend_data = []
    for i in range(6, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        day_att = db.query(models.Attendance).filter(models.Attendance.date == d).all()
        day_present = len([r for r in day_att if r.status in ("Present", "Late")])
        rate = round((day_present / total_students * 100.0), 1) if total_students > 0 else 0.0
        trend_data.append({
            "date": datetime.strptime(d, "%Y-%m-%d").strftime("%a %d"),
            "rate": rate,
            "present": day_present,
            "absent": max(0, total_students - day_present)
        })

    return {
        "total_students": total_students,
        "today_attendance": {
            "present": present_count,
            "total": total_students,
            "percentage": attendance_pct
        },
        "pending_grading": pending_submissions,
        "upcoming_assessments": upcoming_assessments,
        "recent_announcements": [
            {
                "id": a.id,
                "title": a.title,
                "priority": a.priority,
                "created_at": a.created_at.strftime("%b %d, %Y")
            }
            for a in recent_announcements
        ],
        "recent_activities": recent_activities[:6],
        "attendance_trend": trend_data
    }


@router.get("/dashboard/student")
def get_student_dashboard_stats(
    db: Session = Depends(get_db),
    student: models.Student = Depends(get_current_student)
):
    today_str = date.today().isoformat()

    # 1. Attendance percentage
    att_records = db.query(models.Attendance).filter(models.Attendance.student_id == student.id).all()
    total_classes = len(att_records)
    present_count = len([r for r in att_records if r.status in ("Present", "Late")])
    overall_attendance_pct = round((present_count / total_classes * 100.0), 1) if total_classes > 0 else 0.0

    # 2. Today's classes
    subjects = db.query(models.Subject).all()
    today_classes = []
    for idx, s in enumerate(subjects[:4]):
        times = ["09:00 AM - 10:00 AM", "10:15 AM - 11:15 AM", "11:30 AM - 12:30 PM", "02:00 PM - 03:00 PM"]
        # Check if attended today
        attended = any(r.subject_id == s.id and r.date == today_str for r in att_records)
        today_classes.append({
            "subject_code": s.code,
            "subject_name": s.name,
            "faculty": s.faculty.user.full_name if s.faculty else "Faculty",
            "time": times[idx % len(times)],
            "room": f"Room {401 + idx}",
            "attended": attended
        })

    # 3. Pending assignments
    all_assignments = db.query(models.Assignment).all()
    pending_assignments = []
    for a in all_assignments:
        sub = next((s for s in a.submissions if s.student_id == student.id), None)
        if not sub and a.due_date >= datetime.utcnow():
            pending_assignments.append({
                "id": a.id,
                "title": a.title,
                "subject": a.subject.name if a.subject else "",
                "due_date": a.due_date.strftime("%b %d, %I:%M %p"),
                "max_marks": a.max_marks
            })

    # 4. Upcoming assessments
    assessments = db.query(models.Assessment).filter(models.Assessment.is_published == True).all()
    upcoming_assessments = []
    for asmt in assessments:
        res = next((r for r in asmt.results if r.student_id == student.id), None)
        if not res:
            upcoming_assessments.append({
                "id": asmt.id,
                "title": asmt.title,
                "subject": asmt.subject.name if asmt.subject else "",
                "duration": asmt.duration_minutes,
                "total_marks": asmt.total_marks
            })

    # 5. Recent announcements
    announcements = (
        db.query(models.Announcement)
        .order_by(models.Announcement.created_at.desc())
        .limit(3)
        .all()
    )

    # 6. Today's pending tasks
    tasks = (
        db.query(models.Task)
        .filter(
            models.Task.is_completed == False,
            (models.Task.assigned_to_student_id == student.id) | (models.Task.assigned_to_student_id == None)
        )
        .order_by(models.Task.due_date.asc())
        .limit(4)
        .all()
    )

    return {
        "student_name": student.user.full_name,
        "roll_number": student.roll_number,
        "department": student.department,
        "academic_year": student.academic_year,
        "section": student.section,
        "face_registered": student.face_registered,
        "attendance": {
            "percentage": overall_attendance_pct,
            "present": present_count,
            "total": total_classes
        },
        "today_classes": today_classes,
        "pending_assignments": pending_assignments,
        "upcoming_assessments": upcoming_assessments,
        "recent_announcements": [
            {
                "id": a.id,
                "title": a.title,
                "priority": a.priority,
                "content": a.content[:100],
                "created_at": a.created_at.strftime("%b %d, %Y")
            }
            for a in announcements
        ],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "priority": t.priority,
                "due_date": t.due_date.strftime("%b %d") if t.due_date else "Today"
            }
            for t in tasks
        ]
    }

