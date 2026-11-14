from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import (
    get_current_user,
    get_current_faculty,
)

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])


@router.get("")
def get_announcements(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Announcement)
    if subject_id:
        query = query.filter(models.Announcement.subject_id == subject_id)

    announcements = query.order_by(models.Announcement.created_at.desc()).all()
    results = []

    for a in announcements:
        results.append({
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "priority": a.priority,
            "faculty_name": a.faculty.user.full_name if a.faculty else "Faculty Admin",
            "faculty_avatar": a.faculty.user.avatar if a.faculty else None,
            "subject_id": a.subject_id,
            "created_at": a.created_at.isoformat()
        })
    return results


@router.post("", status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: schemas.AnnouncementCreateRequest,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    announcement = models.Announcement(
        title=payload.title,
        content=payload.content,
        priority=payload.priority,
        faculty_id=faculty.id,
        subject_id=payload.subject_id
    )
    db.add(announcement)

    # Notify all students
    students = db.query(models.Student).all()
    for s in students:
        notif = models.Notification(
            user_id=s.user.id,
            title=f"Announcement: {payload.title}",
            message=payload.content[:150] + ("..." if len(payload.content) > 150 else ""),
            type="ANNOUNCEMENT",
            link="/announcements"
        )
        db.add(notif)

    db.commit()
    return {"success": True, "message": "Announcement posted successfully!", "announcement_id": announcement.id}


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    db.delete(announcement)
    db.commit()
    return {"success": True, "message": "Announcement deleted successfully."}

