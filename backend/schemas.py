from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr


# Auth Schemas
class LoginRequest(BaseModel):
    login: str  # Email or roll number or username
    password: str
    remember_me: Optional[bool] = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    email: str
    profile_id: int
    roll_number: Optional[str] = None
    department: Optional[str] = None
    avatar: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: str
    new_password: str


class PasswordStrengthRequest(BaseModel):
    password: str


class AdminRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    username: Optional[str] = None
    password: str
    confirm_password: Optional[str] = None
    department: Optional[str] = "Central Administration"



class FacultyRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    username: Optional[str] = None
    department: str = "Computer Science & Engineering"
    designation: Optional[str] = "Assistant Professor"
    employee_id: Optional[str] = None
    cabin_room: Optional[str] = "Academic Block B, Room 302"
    phone: Optional[str] = "+91 9876543210"
    course_name: Optional[str] = "Computer Networks"
    course_code: Optional[str] = None
    semester: Optional[int] = 6
    password: str
    confirm_password: str
    avatar_base64: Optional[str] = None


# Student Schemas
class StudentRegisterRequest(BaseModel):
    full_name: str
    roll_number: str
    email: EmailStr
    department: str
    academic_year: str
    section: str
    password: str
    confirm_password: str
    avatar_base64: Optional[str] = None
    face_samples: Optional[List[str]] = []  # List of base64 images


class StudentUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    academic_year: Optional[str] = None
    section: Optional[str] = None
    password: Optional[str] = None


class StudentResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    roll_number: str
    email: str
    department: str
    academic_year: str
    section: str
    face_registered: bool
    avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SubjectCreateRequest(BaseModel):
    name: str
    code: Optional[str] = None
    department: Optional[str] = "Computer Science & Engineering"
    semester: Optional[int] = 6


# Attendance Schemas
class AttendanceScanRequest(BaseModel):
    subject_id: Optional[int] = None
    date: Optional[str] = None  # YYYY-MM-DD
    frame_base64: str  # JPEG/PNG frame from webcam


class FaceVerificationRequest(BaseModel):
    target_student_id: Optional[int] = None
    subject_id: Optional[int] = None
    date: Optional[str] = None
    frame_base64: str
    simulate_proxy: Optional[bool] = False
    simulate_edge_case: Optional[str] = None  # None, 'NO_FACE', 'MULTI_FACE'


class AttendanceManualRequest(BaseModel):
    student_id: int
    subject_id: int
    date: str
    status: str  # 'Present', 'Absent', 'Late'
    remarks: Optional[str] = None
    method: Optional[str] = "MANUAL"
    evidence_image: Optional[str] = None
    proxy_student_name: Optional[str] = None
    proxy_roll_number: Optional[str] = None


class AttendanceRecordResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    roll_number: str
    subject_id: int
    subject_name: str
    date: str
    status: str
    confidence: float
    method: str
    timestamp: datetime
    remarks: Optional[str] = None
    evidence_image: Optional[str] = None
    proxy_student_name: Optional[str] = None
    proxy_roll_number: Optional[str] = None


# Assignment Schemas
class AssignmentCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    subject_id: int
    recipient_type: str = "ALL"  # 'ALL', 'SELECTED', 'GROUP'
    submission_format: Optional[str] = "CODE_AND_WORD"  # 'CODE_AND_WORD', 'CODE_ONLY', 'WORD_ONLY', 'PDF_ONLY', 'ANY'
    max_marks: int = 100
    due_date: str  # ISO string or YYYY-MM-DDTHH:MM:SS
    selected_student_ids: Optional[List[int]] = []
    group_department: Optional[str] = None
    group_year: Optional[str] = None
    group_section: Optional[str] = None
    attachment_base64: Optional[str] = None
    attachment_name: Optional[str] = None


class SubmissionCreateRequest(BaseModel):
    assignment_id: int
    comments: Optional[str] = None
    file_base64: Optional[str] = None
    file_name: Optional[str] = None
    code_file_base64: Optional[str] = None
    code_file_name: Optional[str] = None
    doc_file_base64: Optional[str] = None
    doc_file_name: Optional[str] = None
    force_ai_flag: Optional[bool] = None  # Optional flag to simulate AI or human


class ConvertPdfToDocxRequest(BaseModel):
    file_base64: str
    file_name: str
    assignment_title: Optional[str] = "Assignment Report"


class SubmissionGradeRequest(BaseModel):
    marks_obtained: float
    feedback: Optional[str] = None
    is_ai_detected: Optional[bool] = False
    ai_pct: Optional[float] = 0.0


class ScanAiRequest(BaseModel):
    submission_id: Optional[int] = None
    text: Optional[str] = None
    force_ai_flag: Optional[bool] = None
    force_ai_pct: Optional[float] = None


# Assessment Schemas
class QuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str  # 'A', 'B', 'C', 'D'
    marks: int = 5


class AssessmentCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    subject_id: int
    duration_minutes: int = 30
    total_marks: int = 50
    due_date: Optional[str] = None
    questions: List[QuestionCreate]


class AssessmentAttemptSubmit(BaseModel):
    assessment_id: int
    answers: Dict[str, str]  # question_id -> 'A', 'B', 'C', or 'D'


# Study Material Schemas
class StudyMaterialCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    subject_id: int
    category: str = "Lecture Notes"
    file_base64: str
    file_name: str
    file_size: Optional[str] = "1.5 MB"


# Task Schemas
class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "Normal"  # 'High', 'Medium', 'Normal'
    due_date: Optional[str] = None
    assigned_to_student_id: Optional[int] = None  # None = assigned to all


class TaskToggleRequest(BaseModel):
    is_completed: bool


# Announcement Schemas
class AnnouncementCreateRequest(BaseModel):
    title: str
    content: str
    subject_id: Optional[int] = None
    priority: str = "NORMAL"  # 'NORMAL', 'HIGH', 'URGENT'


# Monitoring Schemas
class MonitoringScanRequest(BaseModel):
    frame_base64: str
    classroom_name: Optional[str] = "Smart Classroom 401"
    simulate_proxy_mismatch: Optional[bool] = False  # Allows testing Day 1 match vs Day 2 mismatch


class SaveSessionVideoRequest(BaseModel):
    title: str
    classroom_name: Optional[str] = "Smart Classroom 401"
    subject_code: Optional[str] = "CS501"
    duration: Optional[str] = "45 mins"
    file_size: Optional[str] = "120 MB"
    distractions_flagged: Optional[int] = 0
    mobile_alerts_flagged: Optional[int] = 0
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


# Notification Schema
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =========================================================================
# MULTI-USER CLASSROOM SESSIONS & SCREEN SHARE SCHEMAS
# =========================================================================

class StartSessionRequest(BaseModel):
    title: Optional[str] = "Lecture: Computer Networks"
    subject_code: Optional[str] = "CS501"
    subject_id: Optional[int] = None
    classroom_name: Optional[str] = "Smart Classroom 401"


class ScreenShareFrameRequest(BaseModel):
    session_id: Optional[str] = None
    frame_base64: str
    is_sharing: bool = True


class ClassroomCreateRequest(BaseModel):
    room_number: str
    building: Optional[str] = "Academic Block B"
    capacity: Optional[int] = 60
    facilities: Optional[str] = "AI Vision Cameras, Smart Projector, Wi-Fi 6"


class TimetableCreateRequest(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    subject_id: int
    faculty_id: int
    classroom_id: Optional[int] = None


class ForgotPasswordOTPRequest(BaseModel):
    email: str


class VerifyOTPAndResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str


