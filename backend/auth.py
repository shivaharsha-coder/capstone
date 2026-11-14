import os
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
import models

SECRET_KEY = os.getenv("JWT_SECRET", "smart_classroom_secret_key_2026_super_secure_jwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Validates password strength:
    Returns {
        "score": 0-4,
        "strength": "Weak" | "Medium" | "Strong",
        "has_min_length": bool (>= 8),
        "has_upper": bool,
        "has_lower": bool,
        "has_number": bool,
        "has_special": bool,
        "is_valid": bool (score >= 3 and has_min_length)
    }
    """
    has_min_length = len(password) >= 8
    has_upper = bool(re.search(r"[A-Z]", password))
    has_lower = bool(re.search(r"[a-z]", password))
    has_number = bool(re.search(r"\d", password))
    has_special = bool(re.search(r"[!@#$%^&*(),.?\":{}|<>]", password))

    score = 0
    if has_min_length:
        score += 1
    if has_upper and has_lower:
        score += 1
    if has_number:
        score += 1
    if has_special:
        score += 1

    if score <= 1:
        strength = "Weak"
    elif score in (2, 3):
        strength = "Medium"
    else:
        strength = "Strong"

    return {
        "score": score,
        "strength": strength,
        "has_min_length": has_min_length,
        "has_upper": has_upper,
        "has_lower": has_lower,
        "has_number": has_number,
        "has_special": has_special,
        "is_valid": has_min_length and has_upper and has_lower and has_number,
    }


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub_val = payload.get("sub")
        id_val = payload.get("id")
        if sub_val is None and id_val is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = None
    if id_val is not None:
        try:
            user = db.query(models.User).filter(models.User.id == int(id_val)).first()
        except (ValueError, TypeError):
            pass

    if user is None and sub_val is not None:
        try:
            user = db.query(models.User).filter(models.User.id == int(sub_val)).first()
        except (ValueError, TypeError):
            user = db.query(models.User).filter(
                (models.User.email == str(sub_val)) | (models.User.username == str(sub_val))
            ).first()

    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_faculty(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> models.Faculty:
    if current_user.role != "FACULTY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to faculty only"
        )
    faculty = db.query(models.Faculty).filter(models.Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found"
        )
    return faculty


def get_current_student(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> models.Student:
    if current_user.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to students only"
        )
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )
    return student


def get_current_admin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> models.User:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to administrators only"
        )
    return current_user


def get_current_faculty_or_admin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> models.User:
    if current_user.role not in ("FACULTY", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to faculty or administrators only"
        )
    return current_user


