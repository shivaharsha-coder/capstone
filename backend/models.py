from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'FACULTY' or 'STUDENT'
    full_name = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    faculty_profile = relationship("Faculty", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    designation = Column(String(100), default="Assistant Professor")
    employee_id = Column(String(50), unique=True, nullable=True)
    cabin_room = Column(String(50), default="A-204")
    phone = Column(String(20), default="+91 9876543210")

    user = relationship("User", back_populates="faculty_profile")
    subjects = relationship("Subject", back_populates="faculty")
    assignments = relationship("Assignment", back_populates="faculty")
    assessments = relationship("Assessment", back_populates="faculty")
    materials = relationship("StudyMaterial", back_populates="faculty")
    announcements = relationship("Announcement", back_populates="faculty")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    roll_number = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False)  # e.g., 'CSE', 'ECE', 'IT'
    academic_year = Column(String(50), nullable=False)  # e.g., '3rd Year'
    section = Column(String(20), nullable=False)  # e.g., 'A', 'B'
    face_registered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="student_profile")
    face_embedding = relationship("FaceEmbedding", back_populates="student", uselist=False, cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    assessment_results = relationship("AssessmentResult", back_populates="student", cascade="all, delete-orphan")
    assigned_tasks = relationship("Task", back_populates="assigned_student", cascade="all, delete-orphan")
    monitoring_events = relationship("MonitoringEvent", back_populates="student", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. 'CS601'
    name = Column(String(255), nullable=False)  # e.g. 'Artificial Intelligence & Machine Learning'
    department = Column(String(100), nullable=False)
    semester = Column(Integer, default=6)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)

    faculty = relationship("Faculty", back_populates="subjects")
    enrollments = relationship("Enrollment", back_populates="subject", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="subject")
    assignments = relationship("Assignment", back_populates="subject")
    assessments = relationship("Assessment", back_populates="subject")
    materials = relationship("StudyMaterial", back_populates="subject")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject", back_populates="enrollments")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, nullable=False)
    embedding_data = Column(JSON, nullable=False)  # List of floats or nested lists of embeddings
    sample_count = Column(Integer, default=1)
    sample_image_path = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="face_embedding")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    status = Column(String(20), nullable=False, default="Present")  # 'Present', 'Absent', 'Late'
    confidence = Column(Float, default=1.0)  # Recognition confidence, 0.0 - 1.0
    method = Column(String(50), default="AI_FACE")  # 'AI_FACE', 'MANUAL', 'AI_FAKE_STUDENT_REJECTED'
    marked_by = Column(String(100), default="System")
    remarks = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    evidence_image = Column(Text, nullable=True)  # Snapshot photo of impostor/cheating attempt
    proxy_student_name = Column(String(100), nullable=True)  # Name of proxy attempt person
    proxy_roll_number = Column(String(50), nullable=True)  # Roll number / Hall Ticket of proxy student

    student = relationship("Student", back_populates="attendance_records")
    subject = relationship("Subject", back_populates="attendance_records")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    recipient_type = Column(String(50), default="ALL")  # 'ALL', 'SELECTED', 'GROUP'
    max_marks = Column(Integer, default=100)
    due_date = Column(DateTime, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    submission_format = Column(String(50), default="CODE_AND_WORD")  # 'CODE_AND_WORD', 'CODE_ONLY', 'WORD_ONLY', 'PDF_ONLY', 'ANY'
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", back_populates="assignments")
    faculty = relationship("Faculty", back_populates="assignments")
    recipients = relationship("AssignmentRecipient", back_populates="assignment", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentRecipient(Base):
    __tablename__ = "assignment_recipients"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    group_department = Column(String(100), nullable=True)
    group_year = Column(String(50), nullable=True)
    group_section = Column(String(20), nullable=True)

    assignment = relationship("Assignment", back_populates="recipients")
    student = relationship("Student")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    code_file_url = Column(String(500), nullable=True)
    code_file_name = Column(String(255), nullable=True)
    doc_file_url = Column(String(500), nullable=True)
    doc_file_name = Column(String(255), nullable=True)
    comments = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    marks_obtained = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime, nullable=True)
    ai_generated_pct = Column(Float, default=0.0)
    ai_status = Column(String(100), default="0% AI Used - Human Authored")
    ai_report = Column(Text, nullable=True)
    is_ai_flagged = Column(Boolean, default=False)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", back_populates="submissions")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    duration_minutes = Column(Integer, default=30)
    total_marks = Column(Integer, default=50)
    is_published = Column(Boolean, default=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", back_populates="assessments")
    faculty = relationship("Faculty", back_populates="assessments")
    questions = relationship("Question", back_populates="assessment", cascade="all, delete-orphan")
    results = relationship("AssessmentResult", back_populates="assessment", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(String(255), nullable=False)
    option_b = Column(String(255), nullable=False)
    option_c = Column(String(255), nullable=False)
    option_d = Column(String(255), nullable=False)
    correct_option = Column(String(10), nullable=False)  # 'A', 'B', 'C', or 'D'
    marks = Column(Integer, default=5)

    assessment = relationship("Assessment", back_populates="questions")


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    score = Column(Float, nullable=False)
    total_marks = Column(Integer, nullable=False)
    answers_json = Column(JSON, nullable=True)  # Student's submitted answers
    completed_at = Column(DateTime, default=datetime.utcnow)
    ai_generated_pct = Column(Float, default=0.0)
    ai_status = Column(String(100), default="0% AI Used")
    is_ai_flagged = Column(Boolean, default=False)

    assessment = relationship("Assessment", back_populates="results")
    student = relationship("Student", back_populates="assessment_results")


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(String(50), default="1.5 MB")
    category = Column(String(100), default="Lecture Notes")  # 'Lecture Notes', 'Syllabus', 'Reference Book', 'Slides'
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", back_populates="materials")
    faculty = relationship("Faculty", back_populates="materials")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    priority = Column(String(50), default="NORMAL")  # 'NORMAL', 'HIGH', 'URGENT'
    created_at = Column(DateTime, default=datetime.utcnow)

    faculty = relationship("Faculty", back_populates="announcements")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_student_id = Column(Integer, ForeignKey("students.id"), nullable=True)  # Null if general / all
    priority = Column(String(50), default="Normal")  # 'High', 'Medium', 'Normal'
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User")
    assigned_student = relationship("Student", back_populates="assigned_tasks")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="ANNOUNCEMENT")  # 'ASSIGNMENT', 'ASSESSMENT', 'ANNOUNCEMENT', 'ATTENDANCE', 'MONITORING', 'GRADE'
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class MonitoringEvent(Base):
    __tablename__ = "monitoring_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    event_type = Column(String(100), nullable=False)  # 'MOBILE_PHONE', 'DISTRACTED', 'INATTENTIVE', 'LOOKING_AWAY'
    confidence = Column(Float, default=0.85)
    image_snapshot = Column(String(500), nullable=True)
    classroom_name = Column(String(100), default="Smart Classroom 401")
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    is_reviewed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    student = relationship("Student", back_populates="monitoring_events")
    faculty = relationship("Faculty")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., 'CSE', 'ECE'
    name = Column(String(255), nullable=False)  # e.g., 'Computer Science & Engineering'
    head_of_department = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    intake = Column(Integer, default=120)
    created_at = Column(DateTime, default=datetime.utcnow)


class AttendanceAuditLog(Base):
    __tablename__ = "attendance_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"), nullable=False)
    modified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    old_status = Column(String(20), nullable=False)
    new_status = Column(String(20), nullable=False)
    reason = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    modifier = relationship("User")
    attendance = relationship("Attendance")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(500), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClassSessionVideo(Base):
    __tablename__ = "class_session_videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    classroom_name = Column(String(100), default="Smart Classroom 401")
    subject_code = Column(String(50), nullable=True)
    faculty_name = Column(String(255), nullable=True)
    video_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    duration = Column(String(50), default="45 mins")
    file_size = Column(String(50), default="128 MB")
    distractions_flagged = Column(Integer, default=0)
    mobile_alerts_flagged = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=datetime.utcnow)


# =========================================================================
# MULTI-USER & PHYSICAL CAMPUS ADDITIVE MODELS (Non-destructive)
# =========================================================================

class Classroom(Base):
    """Physical campus classroom facilities."""
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., 'LH-401'
    building = Column(String(100), default="Academic Block B")
    capacity = Column(Integer, default=60)
    facilities = Column(String(255), default="AI Vision Cameras, Smart Projector, Wi-Fi 6")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    timetables = relationship("Timetable", back_populates="classroom", cascade="all, delete-orphan")


class Timetable(Base):
    """Academic timetable schedule linking faculty, subjects, and classrooms."""
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(String(20), nullable=False)  # 'Monday', 'Tuesday', ...
    start_time = Column(String(10), nullable=False)  # '09:00 AM'
    end_time = Column(String(10), nullable=False)    # '10:00 AM'
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject")
    faculty = relationship("Faculty")
    classroom = relationship("Classroom", back_populates="timetables")


class ClassroomSession(Base):
    """
    Persistent Multi-Faculty Classroom Sessions.
    Allows multiple faculty members to simultaneously operate independent live lectures,
    screen share with students, and record attendance without cross-session collision.
    """
    __tablename__ = "classroom_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_code = Column(String(100), unique=True, index=True, nullable=False)  # e.g., 'SES-CS501-A9B1'
    title = Column(String(255), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    subject_code = Column(String(50), nullable=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    faculty_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    faculty_name = Column(String(255), nullable=False)
    classroom_name = Column(String(100), default="Smart Classroom 401")
    status = Column(String(20), default="ACTIVE")  # 'ACTIVE', 'COMPLETED'
    is_screen_sharing = Column(Boolean, default=False)
    screen_share_frame = Column(Text, nullable=True)  # Latest active screen snapshot (base64)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    attending_count = Column(Integer, default=0)

    faculty = relationship("Faculty")
    subject = relationship("Subject")


class PasswordResetOTP(Base):
    """Secure 6-digit OTP verification for password reset."""
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    otp_code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")




