import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
import models
import schemas
from auth import (
    get_current_user,
    get_current_faculty,
    hash_password,
    validate_password_strength,
)
import face_service

router = APIRouter(prefix="/api/students", tags=["Student Management"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILES_DIR = os.path.join(BASE_DIR, "uploads", "profiles")
os.makedirs(PROFILES_DIR, exist_ok=True)


@router.get("", response_model=List[schemas.StudentResponse])
def get_all_students(
    department: Optional[str] = None,
    academic_year: Optional[str] = None,
    section: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = (
        db.query(models.Student)
        .join(models.User, models.User.id == models.Student.user_id)
    )

    if department:
        query = query.filter(models.Student.department == department)
    if academic_year:
        query = query.filter(models.Student.academic_year == academic_year)
    if section:
        query = query.filter(models.Student.section == section)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.User.full_name.ilike(s),
                models.Student.roll_number.ilike(s),
                models.User.email.ilike(s)
            )
        )

    students = query.order_by(models.Student.roll_number.asc()).all()

    results = []
    for s in students:
        results.append(
            schemas.StudentResponse(
                id=s.id,
                user_id=s.user_id,
                full_name=s.user.full_name,
                roll_number=s.roll_number,
                email=s.user.email,
                department=s.department,
                academic_year=s.academic_year,
                section=s.section,
                face_registered=s.face_registered,
                avatar=s.user.avatar,
                created_at=s.created_at
            )
        )
    return results


@router.get("/{student_id}", response_model=schemas.StudentResponse)
def get_student_by_id(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return schemas.StudentResponse(
        id=student.id,
        user_id=student.user_id,
        full_name=student.user.full_name,
        roll_number=student.roll_number,
        email=student.user.email,
        department=student.department,
        academic_year=student.academic_year,
        section=student.section,
        face_registered=student.face_registered,
        avatar=student.user.avatar,
        created_at=student.created_at
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_student(
    payload: schemas.StudentRegisterRequest,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    # 1. Validation: password match
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match."
        )

    # 2. Password strength validation
    strength = validate_password_strength(payload.password)
    if not strength["has_min_length"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    # 3. Check duplicate email
    email = payload.email.strip().lower()
    existing_user = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{payload.email}' is already registered."
        )

    # 4. Check duplicate roll number
    roll_num = payload.roll_number.strip().upper()
    existing_roll = db.query(models.Student).filter(models.Student.roll_number == roll_num).first()
    if existing_roll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Roll Number '{roll_num}' is already assigned to another student."
        )

    # 5. Handle avatar / profile picture
    avatar_url = None
    if payload.avatar_base64:
        try:
            img = face_service.decode_base64_image(payload.avatar_base64)
            if img is not None:
                filename = f"avatar_{roll_num.lower()}_{uuid.uuid4().hex[:6]}.jpg"
                save_path = os.path.join(PROFILES_DIR, filename)
                import cv2
                cv2.imwrite(save_path, img)
                avatar_url = f"/uploads/profiles/{filename}"
        except Exception as e:
            print(f"Error saving avatar: {e}")

    # 6. Create User record
    new_user = models.User(
        email=email,
        username=roll_num.lower(),
        password_hash=hash_password(payload.password),
        role="STUDENT",
        full_name=payload.full_name.strip(),
        avatar=avatar_url or payload.avatar_base64,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # 7. Create Student record
    new_student = models.Student(
        user_id=new_user.id,
        roll_number=roll_num,
        department=payload.department.strip(),
        academic_year=payload.academic_year.strip(),
        section=payload.section.strip().upper(),
        face_registered=False
    )
    db.add(new_student)
    db.flush()

    # 8. Enroll in department's subjects automatically
    matching_subjects = db.query(models.Subject).filter(
        models.Subject.department == payload.department.strip()
    ).all()
    for subj in matching_subjects:
        enrollment = models.Enrollment(student_id=new_student.id, subject_id=subj.id)
        db.add(enrollment)

    # 9. Handle Face Registration if samples provided
    face_message = "No face samples provided. Student can register face later."
    if payload.face_samples and len(payload.face_samples) > 0:
        reg_result = face_service.register_face_from_samples(payload.face_samples)
        if reg_result["success"] and reg_result["embedding"]:
            face_emb = models.FaceEmbedding(
                student_id=new_student.id,
                embedding_data=reg_result["embedding"],
                sample_count=reg_result["sample_count"],
                sample_image_path=reg_result.get("sample_preview")
            )
            db.add(face_emb)
            new_student.face_registered = True
            face_message = f"Face registered successfully with {reg_result['sample_count']} samples."

    # Send welcome notification to student
    notification = models.Notification(
        user_id=new_user.id,
        title="Welcome to Smart Classroom",
        message=f"Welcome {new_user.full_name}! Your student account is active. Roll Number: {roll_num}.",
        type="ANNOUNCEMENT",
        link="/dashboard"
    )
    db.add(notification)

    db.commit()

    return {
        "success": True,
        "message": f"Student '{new_user.full_name}' ({roll_num}) successfully registered! {face_message}",
        "student_id": new_student.id,
        "roll_number": roll_num,
        "face_registered": new_student.face_registered
    }


@router.post("/{student_id}/face-register")
def register_student_face(
    student_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Allows registering or updating face embeddings for an existing student."""
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Only faculty or the student themselves can register face
    if current_user.role == "STUDENT" and current_user.student_profile.id != student_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    samples = payload.get("samples", [])
    if not samples:
        raise HTTPException(status_code=400, detail="At least one face sample image is required.")

    result = face_service.register_face_from_samples(samples)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    existing_emb = db.query(models.FaceEmbedding).filter(models.FaceEmbedding.student_id == student_id).first()
    if existing_emb:
        existing_emb.embedding_data = result["embedding"]
        existing_emb.sample_count = result["sample_count"]
        existing_emb.sample_image_path = result.get("sample_preview")
    else:
        new_emb = models.FaceEmbedding(
            student_id=student_id,
            embedding_data=result["embedding"],
            sample_count=result["sample_count"],
            sample_image_path=result.get("sample_preview")
        )
        db.add(new_emb)

    student.face_registered = True
    db.commit()

    return {
        "success": True,
        "message": f"Face registered successfully for {student.user.full_name} ({student.roll_number})!",
        "sample_count": result["sample_count"]
    }


@router.put("/{student_id}")
def update_student(
    student_id: int,
    payload: schemas.StudentUpdateRequest,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = student.user
    if payload.full_name:
        user.full_name = payload.full_name.strip()
    if payload.email:
        email = payload.email.strip().lower()
        exist = db.query(models.User).filter(models.User.email == email, models.User.id != user.id).first()
        if exist:
            raise HTTPException(status_code=400, detail="Email already taken.")
        user.email = email
    if payload.department:
        student.department = payload.department.strip()
    if payload.academic_year:
        student.academic_year = payload.academic_year.strip()
    if payload.section:
        student.section = payload.section.strip().upper()
    if payload.password:
        strength = validate_password_strength(payload.password)
        if not strength["has_min_length"]:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
        user.password_hash = hash_password(payload.password)

    db.commit()
    return {"success": True, "message": "Student details updated successfully."}


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user_id = student.user_id
    db.delete(student)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.delete(user)
    db.commit()

    return {"success": True, "message": "Student deleted successfully."}

