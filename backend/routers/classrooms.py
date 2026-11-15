from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import (
    get_current_user,
    get_current_admin,
    get_current_faculty_or_admin,
)

router = APIRouter(prefix="/api/classrooms", tags=["Classrooms & Timetables"])


# =========================================================================
# 1. CLASSROOM MANAGEMENT
# =========================================================================

@router.get("")
def get_all_classrooms(db: Session = Depends(get_db)):
    """Returns all campus smart classrooms and lecture halls."""
    classrooms = db.query(models.Classroom).filter(models.Classroom.is_active == True).all()

    # Seed default classrooms if none exist
    if not classrooms:
        defaults = [
            {"room_number": "LH-401", "building": "Academic Block B", "capacity": 65, "facilities": "AI Vision Cameras, Smart Projector, Wi-Fi 6"},
            {"room_number": "LH-402", "building": "Academic Block B", "capacity": 65, "facilities": "AI Vision Cameras, Dual Displays, Audio Pod"},
            {"room_number": "LAB-201", "building": "Computer Science Wing", "capacity": 45, "facilities": "High-Performance Workstations, GPU Rack, Webcams"},
            {"room_number": "SEMINAR-1", "building": "Central Library Complex", "capacity": 120, "facilities": "Auditorium Vision Array, Stage Mic, Screen Share"},
        ]
        for d in defaults:
            db.add(models.Classroom(**d))
        db.commit()
        classrooms = db.query(models.Classroom).filter(models.Classroom.is_active == True).all()

    return [
        {
            "id": c.id,
            "room_number": c.room_number,
            "building": c.building,
            "capacity": c.capacity,
            "facilities": c.facilities,
            "is_active": c.is_active,
            "created_at": c.created_at.strftime("%b %d, %Y") if c.created_at else "Active"
        }
        for c in classrooms
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_classroom(
    payload: schemas.ClassroomCreateRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """Admin registers a new campus classroom."""
    existing = db.query(models.Classroom).filter(
        models.Classroom.room_number.ilike(payload.room_number.strip())
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Classroom '{payload.room_number}' already exists."
        )

    classroom = models.Classroom(
        room_number=payload.room_number.strip().upper(),
        building=payload.building or "Academic Block B",
        capacity=payload.capacity or 60,
        facilities=payload.facilities or "AI Vision Cameras, Smart Projector",
        is_active=True
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)

    return {"success": True, "message": f"Classroom {classroom.room_number} added.", "classroom": classroom.id}


# =========================================================================
# 2. TIMETABLE & SCHEDULE MANAGEMENT
# =========================================================================

@router.get("/timetables/all")
def get_timetables(
    day: Optional[str] = None,
    faculty_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Returns timetable schedule entries."""
    query = db.query(models.Timetable)
    if day:
        query = query.filter(models.Timetable.day_of_week.ilike(day))
    if faculty_id:
        query = query.filter(models.Timetable.faculty_id == faculty_id)
    if subject_id:
        query = query.filter(models.Timetable.subject_id == subject_id)

    timetables = query.all()

    # Seed baseline timetable if empty
    if not timetables and not day and not faculty_id:
        first_fac = db.query(models.Faculty).first()
        first_sub = db.query(models.Subject).first()
        first_room = db.query(models.Classroom).first()
        if first_fac and first_sub and first_room:
            presets = [
                {"day_of_week": "Monday", "start_time": "09:00 AM", "end_time": "10:30 AM", "subject_id": first_sub.id, "faculty_id": first_fac.id, "classroom_id": first_room.id},
                {"day_of_week": "Wednesday", "start_time": "11:00 AM", "end_time": "12:30 PM", "subject_id": first_sub.id, "faculty_id": first_fac.id, "classroom_id": first_room.id},
                {"day_of_week": "Friday", "start_time": "02:00 PM", "end_time": "03:30 PM", "subject_id": first_sub.id, "faculty_id": first_fac.id, "classroom_id": first_room.id},
            ]
            for p in presets:
                db.add(models.Timetable(**p))
            db.commit()
            timetables = query.all()

    return [
        {
            "id": t.id,
            "day_of_week": t.day_of_week,
            "start_time": t.start_time,
            "end_time": t.end_time,
            "subject_name": t.subject.name if t.subject else "Subject",
            "subject_code": t.subject.code if t.subject else "",
            "faculty_name": t.faculty.user.full_name if t.faculty and t.faculty.user else "Faculty",
            "room_number": t.classroom.room_number if t.classroom else "Smart Classroom 401"
        }
        for t in timetables
    ]


@router.post("/timetables", status_code=status.HTTP_201_CREATED)
def create_timetable_slot(
    payload: schemas.TimetableCreateRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """Admin schedules a timetable slot."""
    slot = models.Timetable(
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        subject_id=payload.subject_id,
        faculty_id=payload.faculty_id,
        classroom_id=payload.classroom_id
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    return {"success": True, "message": "Timetable slot scheduled successfully.", "slot_id": slot.id}
