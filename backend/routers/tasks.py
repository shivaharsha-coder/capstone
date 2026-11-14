from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
import models
import schemas
from auth import (
    get_current_user,
    get_current_faculty,
)

router = APIRouter(prefix="/api/tasks", tags=["Today's Tasks"])


@router.get("")
def get_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "FACULTY":
        tasks = db.query(models.Task).order_by(models.Task.created_at.desc()).all()
    else:
        student = current_user.student_profile
        # Students see tasks assigned to them specifically OR tasks assigned to all (assigned_to_student_id is None)
        tasks = (
            db.query(models.Task)
            .filter(
                or_(
                    models.Task.assigned_to_student_id == (student.id if student else None),
                    models.Task.assigned_to_student_id == None
                )
            )
            .order_by(models.Task.created_at.desc())
            .all()
        )

    results = []
    for t in tasks:
        results.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "is_completed": t.is_completed,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "created_by": t.creator.full_name if t.creator else "Faculty",
            "assigned_to": t.assigned_student.user.full_name if t.assigned_student else "All Students",
            "assigned_to_id": t.assigned_to_student_id,
            "created_at": t.created_at.isoformat()
        })
    return results


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(
    payload: schemas.TaskCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    due_dt = None
    if payload.due_date:
        try:
            due_dt = datetime.fromisoformat(payload.due_date.replace("Z", "+00:00"))
        except Exception:
            pass

    task = models.Task(
        title=payload.title,
        description=payload.description,
        created_by_user_id=current_user.id,
        assigned_to_student_id=payload.assigned_to_student_id,
        priority=payload.priority,
        due_date=due_dt
    )
    db.add(task)

    # Notify student if assigned specifically
    if payload.assigned_to_student_id:
        target_student = db.query(models.Student).filter(models.Student.id == payload.assigned_to_student_id).first()
        if target_student:
            notif = models.Notification(
                user_id=target_student.user.id,
                title="New Task Assigned",
                message=f"Task: '{task.title}' has been assigned to you. Priority: {task.priority}.",
                type="ANNOUNCEMENT",
                link="/tasks"
            )
            db.add(notif)

    db.commit()
    return {"success": True, "message": "Task created successfully!", "task_id": task.id}


@router.put("/{task_id}/toggle")
def toggle_task_completion(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_completed = not task.is_completed
    task.completed_at = datetime.utcnow() if task.is_completed else None
    db.commit()

    return {"success": True, "is_completed": task.is_completed, "message": "Task status updated."}


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"success": True, "message": "Task deleted successfully."}

