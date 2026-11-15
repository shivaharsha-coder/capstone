import re
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from database import get_db
import models
import schemas
from auth import (
    verify_password,
    hash_password,
    create_access_token,
    validate_password_strength,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/admin/login", response_model=schemas.TokenResponse)
def admin_login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    login = payload.login.strip().lower()
    user = db.query(models.User).filter(
        models.User.role == "ADMIN",
        or_(models.User.email.ilike(login), models.User.username.ilike(login))
    ).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials. Please check your email/username and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your administrator account has been disabled."
        )

    token = create_access_token(data={"sub": str(user.id), "role": "ADMIN", "email": user.email})

    return schemas.TokenResponse(
        access_token=token,
        role="ADMIN",
        user_id=user.id,
        name=user.full_name,
        email=user.email,
        profile_id=user.id,
        department="Administration",
        avatar=user.avatar
    )


@router.post("/admin/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def admin_register(payload: schemas.AdminRegisterRequest, db: Session = Depends(get_db)):
    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match."
        )

    strength = validate_password_strength(payload.password)
    if not strength["has_min_length"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    email = payload.email.strip().lower()
    existing_user = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{payload.email}' is already registered."
        )

    base_username = (payload.username or payload.email.split("@")[0]).strip().lower()
    username = base_username
    suffix = 1
    while db.query(models.User).filter(models.User.username == username).first():
        username = f"{base_username}_{suffix}"
        suffix += 1

    new_user = models.User(
        email=email,
        username=username,
        password_hash=hash_password(payload.password),
        role="ADMIN",
        full_name=payload.full_name.strip(),
        avatar=f"https://api.dicebear.com/7.x/initials/svg?seed={payload.full_name.strip()}",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "role": "ADMIN", "email": new_user.email})

    return schemas.TokenResponse(
        access_token=token,
        role="ADMIN",
        user_id=new_user.id,
        name=new_user.full_name,
        email=new_user.email,
        profile_id=new_user.id,
        department="Central Administration",
        avatar=new_user.avatar
    )




@router.post("/faculty/login", response_model=schemas.TokenResponse)
def faculty_login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    login = payload.login.strip().lower()
    user = db.query(models.User).filter(
        models.User.role == "FACULTY",
        or_(models.User.email.ilike(login), models.User.username.ilike(login))
    ).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid faculty credentials. Please check your email/username and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your faculty account is deactivated. Please contact the administrator."
        )

    faculty_profile = user.faculty_profile
    token = create_access_token(data={"sub": str(user.id), "role": "FACULTY", "email": user.email})

    return schemas.TokenResponse(
        access_token=token,
        role="FACULTY",
        user_id=user.id,
        name=user.full_name,
        email=user.email,
        profile_id=faculty_profile.id if faculty_profile else 0,
        department=faculty_profile.department if faculty_profile else None,
        avatar=user.avatar
    )


@router.post("/student/login", response_model=schemas.TokenResponse)
def student_login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    login = payload.login.strip()
    # Student can login by email or University Roll Number
    user = (
        db.query(models.User)
        .outerjoin(models.Student, models.Student.user_id == models.User.id)
        .filter(
            models.User.role == "STUDENT",
            or_(
                models.User.email.ilike(login),
                models.Student.roll_number.ilike(login),
                models.User.username.ilike(login)
            )
        )
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid student credentials. Please check your Roll Number/Email and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your student account has been disabled."
        )

    student_profile = user.student_profile
    token = create_access_token(data={"sub": str(user.id), "role": "STUDENT", "email": user.email})

    return schemas.TokenResponse(
        access_token=token,
        role="STUDENT",
        user_id=user.id,
        name=user.full_name,
        email=user.email,
        profile_id=student_profile.id if student_profile else 0,
        roll_number=student_profile.roll_number if student_profile else None,
        department=student_profile.department if student_profile else None,
        avatar=user.avatar
    )


@router.post("/student/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def student_register(payload: schemas.StudentRegisterRequest, db: Session = Depends(get_db)):
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
            detail=f"Roll Number '{roll_num}' is already registered."
        )

    # 5. Create User record
    new_user = models.User(
        email=email,
        username=roll_num.lower(),
        password_hash=hash_password(payload.password),
        role="STUDENT",
        full_name=payload.full_name.strip(),
        avatar=payload.avatar_base64,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # 6. Create Student record
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

    # 7. Auto-enroll in department subjects
    matching_subjects = db.query(models.Subject).filter(
        models.Subject.department == payload.department.strip()
    ).all()
    for subj in matching_subjects:
        db.add(models.Enrollment(student_id=new_student.id, subject_id=subj.id))

    # 8. Face Registration if provided
    if payload.face_samples and len(payload.face_samples) > 0:
        import face_service
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

    # Welcome notification
    notif = models.Notification(
        user_id=new_user.id,
        title="Welcome to Smart Classroom",
        message=f"Welcome {new_user.full_name}! Your student account is active. Roll Number: {roll_num}.",
        type="ANNOUNCEMENT",
        link="/dashboard"
    )
    db.add(notif)
    db.commit()

    token = create_access_token(data={"sub": str(new_user.id), "role": "STUDENT", "email": new_user.email})

    return schemas.TokenResponse(
        access_token=token,
        role="STUDENT",
        user_id=new_user.id,
        name=new_user.full_name,
        email=new_user.email,
        profile_id=new_student.id,
        roll_number=new_student.roll_number,
        department=new_student.department,
        avatar=new_user.avatar
    )


@router.post("/faculty/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def faculty_register(payload: schemas.FacultyRegisterRequest, db: Session = Depends(get_db)):
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
            detail=f"Email '{payload.email}' is already registered. Please sign in or use a different email."
        )

    # 4. Generate guaranteed unique username
    base_username = (payload.username or email.split("@")[0]).strip().lower()
    base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username) or "faculty"
    username = base_username
    u_suffix = 1
    while db.query(models.User).filter(models.User.username.ilike(username)).first():
        username = f"{base_username}{u_suffix}"
        u_suffix += 1

    new_user = models.User(
        email=email,
        username=username,
        password_hash=hash_password(payload.password),
        role="FACULTY",
        full_name=payload.full_name.strip(),
        avatar=payload.avatar_base64,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # 5. Handle Employee ID uniqueness safely
    raw_emp_id = (payload.employee_id or "").strip()
    if raw_emp_id:
        existing_emp = db.query(models.Faculty).filter(models.Faculty.employee_id == raw_emp_id).first()
        if existing_emp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee ID '{raw_emp_id}' is already registered to faculty member '{existing_emp.user.full_name}'. Please enter a unique Employee ID."
            )
        emp_id = raw_emp_id
    else:
        emp_id = f"FAC-{new_user.id:03d}"
        e_suffix = 1
        while db.query(models.Faculty).filter(models.Faculty.employee_id == emp_id).first():
            emp_id = f"FAC-{new_user.id:03d}-{e_suffix}"
            e_suffix += 1

    new_faculty = models.Faculty(
        user_id=new_user.id,
        department=payload.department.strip(),
        designation=payload.designation or "Assistant Professor",
        employee_id=emp_id,
        cabin_room=payload.cabin_room or "Academic Block B",
        phone=payload.phone or "+91 9876543210"
    )
    db.add(new_faculty)
    db.flush()

    # 6. Assign or Create Course / Subject taught by this faculty (guaranteed unique code)
    course_name = (payload.course_name or "Computer Networks").strip()
    course_code = (payload.course_code or "").strip().upper()
    if not course_code:
        words = [w for w in course_name.split() if w.isalnum()]
        prefix = "".join([w[0] for w in words])[:3].upper() if words else "CS"
        course_code = f"{prefix}-{new_user.id:02d}"

    existing_subject = db.query(models.Subject).filter(models.Subject.code == course_code).first()
    if existing_subject:
        if existing_subject.faculty_id is None:
            existing_subject.faculty_id = new_faculty.id
            target_subject = existing_subject
        else:
            # Subject already assigned to another faculty; create a new section with a guaranteed unique code
            sec_idx = 1
            candidate_code = f"{course_code}-SEC{sec_idx}"
            while db.query(models.Subject).filter(models.Subject.code == candidate_code).first():
                sec_idx += 1
                candidate_code = f"{course_code}-SEC{sec_idx}"

            target_subject = models.Subject(
                code=candidate_code,
                name=f"{course_name} (Section {sec_idx})",
                department=new_faculty.department,
                semester=payload.semester or 5,
                faculty_id=new_faculty.id
            )
            db.add(target_subject)
    else:
        target_subject = models.Subject(
            code=course_code,
            name=course_name,
            department=new_faculty.department,
            semester=payload.semester or 5,
            faculty_id=new_faculty.id
        )
        db.add(target_subject)

    db.flush()

    # 7. Auto-enroll department students into this faculty's course
    dept_students = db.query(models.Student).filter(
        models.Student.department == new_faculty.department
    ).all()
    if not dept_students:
        dept_students = db.query(models.Student).all()

    for st in dept_students:
        already_enrolled = db.query(models.Enrollment).filter(
            models.Enrollment.student_id == st.id,
            models.Enrollment.subject_id == target_subject.id
        ).first()
        if not already_enrolled:
            db.add(models.Enrollment(student_id=st.id, subject_id=target_subject.id))

    # 8. Notification
    notif = models.Notification(
        user_id=new_user.id,
        title="Faculty Account Activated",
        message=f"Welcome {new_user.full_name}! You are registered to manage '{target_subject.name}' ({target_subject.code}).",
        type="ANNOUNCEMENT",
        link="/faculty/dashboard"
    )
    db.add(notif)

    try:
        db.commit()
    except IntegrityError as ie:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration conflict: {str(ie.orig)}"
        )
    except Exception as ex:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during registration: {str(ex)}"
        )

    token = create_access_token(data={"sub": str(new_user.id), "role": "FACULTY", "email": new_user.email})

    return schemas.TokenResponse(
        access_token=token,
        role="FACULTY",
        user_id=new_user.id,
        name=new_user.full_name,
        email=new_user.email,
        profile_id=new_faculty.id,
        department=new_faculty.department,
        avatar=new_user.avatar
    )


@router.post("/validate-password")
def validate_password(payload: schemas.PasswordStrengthRequest):
    return validate_password_strength(payload.password)


@router.post("/request-otp")
def request_password_reset_otp(payload: schemas.ForgotPasswordOTPRequest, db: Session = Depends(get_db)):
    """Generates a secure 6-digit OTP for password reset and logs dispatch."""
    email = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address."
        )

    # Invalidate old OTPs for this email
    db.query(models.PasswordResetOTP).filter(
        models.PasswordResetOTP.email == email,
        models.PasswordResetOTP.is_used == False
    ).update({"is_used": True})

    # Generate cryptographically random 6-digit OTP
    import secrets
    otp = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    otp_record = models.PasswordResetOTP(
        user_id=user.id,
        email=email,
        otp_code=otp,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    # In a production environment, send email via SMTP; in college development, also return preview OTP for testing
    print(f"==================================================")
    print(f"[SECURITY OTP DISPATCH] Password Reset for {email}: {otp}")
    print(f"==================================================")

    return {
        "success": True,
        "message": f"A 6-digit verification code has been dispatched to {email}. Valid for 15 minutes.",
        "otp_preview": otp  # Included for seamless local evaluation and testing
    }


@router.post("/reset-password-otp")
def reset_password_with_otp(payload: schemas.VerifyOTPAndResetPasswordRequest, db: Session = Depends(get_db)):
    """Verifies OTP and securely updates user password."""
    email = payload.email.strip().lower()
    otp_code = payload.otp_code.strip()

    otp_record = db.query(models.PasswordResetOTP).filter(
        models.PasswordResetOTP.email == email,
        models.PasswordResetOTP.otp_code == otp_code,
        models.PasswordResetOTP.is_used == False,
        models.PasswordResetOTP.expires_at >= datetime.utcnow()
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification OTP. Please request a new code."
        )

    user = db.query(models.User).filter(models.User.id == otp_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    strength = validate_password_strength(payload.new_password)
    if not strength["has_min_length"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    user.password_hash = hash_password(payload.new_password)
    otp_record.is_used = True
    db.commit()

    return {"success": True, "message": "Password successfully reset with OTP verification. You may now log in."}


@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address."
        )

    strength = validate_password_strength(payload.new_password)
    if not strength["has_min_length"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long."
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"success": True, "message": "Password has been successfully updated. You may now log in."}


@router.get("/me")
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile_info = {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "avatar": current_user.avatar,
        "created_at": current_user.created_at
    }

    if current_user.role == "FACULTY" and current_user.faculty_profile:
        fac = current_user.faculty_profile
        profile_info.update({
            "faculty_id": fac.id,
            "department": fac.department,
            "designation": fac.designation,
            "employee_id": fac.employee_id,
            "cabin_room": fac.cabin_room,
            "phone": fac.phone
        })
    elif current_user.role == "STUDENT" and current_user.student_profile:
        stud = current_user.student_profile
        profile_info.update({
            "student_id": stud.id,
            "roll_number": stud.roll_number,
            "department": stud.department,
            "academic_year": stud.academic_year,
            "section": stud.section,
            "face_registered": stud.face_registered
        })

    return profile_info

