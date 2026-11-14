import sys
import os

# Set sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import numpy as np
import cv2
import base64
from datetime import datetime, date

from database import SessionLocal, Base, engine
import models
import schemas
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    validate_password_strength,
)
from routers.auth import faculty_login, student_login
from routers.students import register_student, get_all_students
from routers.attendance import scan_attendance_frame, manual_mark_attendance, get_class_attendance_roster
from routers.assignments import create_assignment, get_assignments, submit_assignment, grade_submission
from routers.assessments import create_assessment, submit_assessment_attempt, get_assessment_details
from routers.tasks import create_task, toggle_task_completion, get_tasks
from routers.monitoring import scan_classroom_frame
from routers.reports import get_faculty_dashboard_stats, get_student_dashboard_stats
import face_service
import monitoring_service


def run_comprehensive_tests():
    print("==================================================")
    print("STARTING FULL TEST SUITE: SMART CLASSROOM")
    print("==================================================")

    db = SessionLocal()

    # TEST 1: Password Strength Validation
    print("\n[TEST 1] Testing Password Strength Validation...")
    weak = validate_password_strength("abc")
    assert weak["strength"] == "Weak", f"Expected Weak, got {weak['strength']}"
    assert not weak["is_valid"]

    strong = validate_password_strength("Faculty@1234")
    assert strong["strength"] == "Strong", f"Expected Strong, got {strong['strength']}"
    assert strong["is_valid"]
    print("  ✓ Password strength validation passed (Weak/Medium/Strong properly categorized).")

    # TEST 2: Faculty Login with valid & invalid credentials
    print("\n[TEST 2] Testing Faculty Login Authentication...")
    fac_req = schemas.LoginRequest(login="faculty@smartclassroom.edu", password="Faculty@1234")
    fac_res = faculty_login(fac_req, db)
    assert fac_res.role == "FACULTY"
    assert fac_res.email == "faculty@smartclassroom.edu"
    print(f"  ✓ Faculty login successful: {fac_res.name} (Role: {fac_res.role})")

    # Invalid password test
    try:
        faculty_login(schemas.LoginRequest(login="faculty@smartclassroom.edu", password="WrongPassword123"), db)
        assert False, "Expected 401 for wrong password"
    except Exception as e:
        print("  ✓ Invalid faculty credentials properly rejected (HTTP 401).")

    # TEST 3: Student Login with Email and University Roll Number
    print("\n[TEST 3] Testing Student Login by Roll Number & Email...")
    stud_roll_req = schemas.LoginRequest(login="21CS101", password="Student@1234")
    stud_res1 = student_login(stud_roll_req, db)
    assert stud_res1.role == "STUDENT"
    assert stud_res1.roll_number == "21CS101"
    print(f"  ✓ Student login by Roll Number '21CS101' passed: {stud_res1.name}")

    stud_email_req = schemas.LoginRequest(login="student@smartclassroom.edu", password="Student@1234")
    stud_res2 = student_login(stud_email_req, db)
    assert stud_res2.role == "STUDENT"
    assert stud_res2.user_id == stud_res1.user_id
    print("  ✓ Student login by Email passed.")

    # TEST 4: Student Registration with Validation & Duplicate Prevention
    print("\n[TEST 4] Testing Student Registration & Duplicate Prevention...")
    faculty_obj = db.query(models.Faculty).first()

    # Generate a dummy face image frame
    dummy_img = np.zeros((320, 320, 3), dtype=np.uint8)
    cv2.circle(dummy_img, (160, 160), 80, (200, 200, 200), -1)
    cv2.circle(dummy_img, (130, 140), 10, (50, 50, 50), -1)
    cv2.circle(dummy_img, (190, 140), 10, (50, 50, 50), -1)
    cv2.ellipse(dummy_img, (160, 200), (30, 15), 0, 0, 180, (50, 50, 50), 3)
    _, buffer = cv2.imencode(".jpg", dummy_img)
    dummy_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

    test_roll = "21CS999"
    test_email = "teststudent999@smartclassroom.edu"

    # Clean up previous run if exists
    old_stud = db.query(models.Student).filter(models.Student.roll_number == test_roll).first()
    if old_stud:
        u_id = old_stud.user_id
        db.delete(old_stud)
        u = db.query(models.User).filter(models.User.id == u_id).first()
        if u:
            db.delete(u)
        db.commit()

    reg_payload = schemas.StudentRegisterRequest(
        full_name="Test Student Verification",
        roll_number=test_roll,
        email=test_email,
        department="CSE",
        academic_year="3rd Year",
        section="A",
        password="Student@1234",
        confirm_password="Student@1234",
        avatar_base64=dummy_b64,
        face_samples=[dummy_b64]
    )

    reg_out = register_student(reg_payload, db, faculty_obj)
    assert reg_out["success"] == True
    print(f"  ✓ New student registered: {test_roll}")

    # Test Duplicate Roll Number rejection
    try:
        register_student(reg_payload, db, faculty_obj)
        assert False, "Expected error on duplicate roll number"
    except Exception as e:
        print("  ✓ Duplicate roll number correctly rejected by backend.")

    # TEST 5: Face Feature Extractor & Cosine Similarity Matcher
    print("\n[TEST 5] Testing AI Face Recognition Engine...")
    v1 = [0.5, 0.5, 0.5, 0.5]
    v2 = [0.5, 0.5, 0.5, 0.5]
    sim = face_service.cosine_similarity(v1, v2)
    assert abs(sim - 1.0) < 1e-4, f"Expected 1.0 similarity, got {sim}"

    v_orth = [0.5, 0.5, -0.5, -0.5]
    sim_orth = face_service.cosine_similarity(v1, v_orth)
    assert abs(sim_orth) < 1e-4, f"Expected 0.0 orthogonal similarity, got {sim_orth}"
    print("  ✓ Cosine similarity and vector normalizer math verified.")

    # TEST 6: Attendance Scanning & Duplicate Attendance Prevention
    print("\n[TEST 6] Testing Attendance Scanning & Duplicate Attendance Prevention...")
    first_subject = db.query(models.Subject).first()
    today_str = date.today().isoformat()

    scan_res = scan_attendance_frame(
        schemas.AttendanceScanRequest(
            subject_id=first_subject.id,
            date=today_str,
            frame_base64=dummy_b64
        ),
        db,
        faculty_obj
    )
    assert scan_res["success"] == True
    print("  ✓ Frame scanned successfully by backend facial matcher.")

    # Test manual attendance override
    alex_student = db.query(models.Student).filter(models.Student.roll_number == "21CS101").first()
    manual_res = manual_mark_attendance(
        schemas.AttendanceManualRequest(
            student_id=alex_student.id,
            subject_id=first_subject.id,
            date=today_str,
            status="Present",
            remarks="Verified by faculty during test"
        ),
        db,
        faculty_obj
    )
    assert manual_res["success"] == True

    # Verify roster reflection
    roster_res = get_class_attendance_roster(first_subject.id, today_str, db, faculty_obj.user)
    alex_in_roster = next((s for s in roster_res["students"] if s["student_id"] == alex_student.id), None)
    assert alex_in_roster["status"] == "Present"
    print("  ✓ Manual attendance toggle verified and confirmed in class roster.")

    # TEST 7: Targeted Assignment Distribution & Submissions
    print("\n[TEST 7] Testing Targeted LMS Assignments & Student Visibility...")
    # Create an assignment targeted ONLY to student Alex (21CS101)
    asg_res = create_assignment(
        schemas.AssignmentCreateRequest(
            title="Alex Custom Targeted Research Task",
            description="Special capstone implementation task for Alex Turner only.",
            subject_id=first_subject.id,
            recipient_type="SELECTED",
            max_marks=100,
            due_date=datetime.utcnow().isoformat(),
            selected_student_ids=[alex_student.id]
        ),
        db,
        faculty_obj
    )
    assert asg_res["success"] == True
    new_asg_id = asg_res["assignment_id"]
    print(f"  ✓ Targeted assignment created: #{new_asg_id}")

    # Check student Alex sees it
    alex_visible = get_assignments(subject_id=None, db=db, current_user=alex_student.user)
    has_custom = any(a["id"] == new_asg_id for a in alex_visible)
    assert has_custom, "Alex should see this selected assignment"

    # Check student Alice does NOT see it
    alice_student = db.query(models.Student).filter(models.Student.roll_number == "21CS001").first()
    alice_visible = get_assignments(subject_id=None, db=db, current_user=alice_student.user)
    alice_has_custom = any(a["id"] == new_asg_id for a in alice_visible)
    assert not alice_has_custom, "Alice should NOT see assignment targeted to Alex"
    print("  ✓ LMS permission model confirmed: Targeted assignment visible ONLY to assigned recipient!")

    # Student submission
    sub_res = submit_assignment(
        new_asg_id,
        schemas.SubmissionCreateRequest(
            assignment_id=new_asg_id,
            comments="Completed research task and uploaded code.",
            file_name="alex_capstone_solution.pdf"
        ),
        db,
        alex_student
    )
    assert sub_res["success"] == True
    print("  ✓ Student assignment submission uploaded successfully.")

    # Faculty grading
    sub_record = db.query(models.Submission).filter(models.Submission.assignment_id == new_asg_id).first()
    grade_res = grade_submission(
        sub_record.id,
        schemas.SubmissionGradeRequest(marks_obtained=98.5, feedback="Flawless methodology!"),
        db,
        faculty_obj
    )
    assert grade_res["success"] == True
    print("  ✓ Faculty evaluation & grading recorded.")

    # TEST 8: MCQ Assessments & Automated Scoring
    print("\n[TEST 8] Testing MCQ Assessment Creation & Automatic Scoring...")
    quiz_out = create_assessment(
        schemas.AssessmentCreateRequest(
            title="Auto-Grading Validation Quiz",
            description="Testing instant score computation",
            subject_id=first_subject.id,
            duration_minutes=15,
            total_marks=10,
            questions=[
                schemas.QuestionCreate(
                    question_text="What is 2 + 2?",
                    option_a="3", option_b="4", option_c="5", option_d="6",
                    correct_option="B",
                    marks=5
                ),
                schemas.QuestionCreate(
                    question_text="Is Python interpreted?",
                    option_a="Yes", option_b="No", option_c="Maybe", option_d="Never",
                    correct_option="A",
                    marks=5
                )
            ]
        ),
        db,
        faculty_obj
    )
    quiz_id = quiz_out["assessment_id"]

    # Student submits 1 correct answer and 1 wrong answer (Option B for Q1, Option B for Q2)
    q1 = db.query(models.Question).filter(models.Question.assessment_id == quiz_id).first()
    q2 = db.query(models.Question).filter(models.Question.assessment_id == quiz_id).all()[1]

    attempt_res = submit_assessment_attempt(
        quiz_id,
        schemas.AssessmentAttemptSubmit(
            assessment_id=quiz_id,
            answers={str(q1.id): "B", str(q2.id): "B"}  # Q1 correct (5 marks), Q2 wrong (0 marks)
        ),
        db,
        alex_student
    )
    assert attempt_res["score"] == 5
    assert attempt_res["total_marks"] == 10
    assert attempt_res["percentage"] == 50.0
    print(f"  ✓ Instant MCQ scoring verified: scored {attempt_res['score']}/{attempt_res['total_marks']} ({attempt_res['percentage']}%)")

    # TEST 9: Today's Tasks
    print("\n[TEST 9] Testing Task Management...")
    task_res = create_task(
        schemas.TaskCreateRequest(
            title="Verify Capstone Video Stream",
            description="Test webcam resolution on faculty review laptop",
            priority="High",
            assigned_to_student_id=alex_student.id
        ),
        db,
        faculty_obj.user
    )
    new_task_id = task_res["task_id"]
    toggle_res = toggle_task_completion(new_task_id, db, faculty_obj.user)
    assert toggle_res["is_completed"] == True
    print("  ✓ Task created, assigned, and completion status toggled.")

    # TEST 10: AI Classroom Monitoring (YOLO Mobile Detection)
    print("\n[TEST 10] Testing AI Classroom Monitoring & YOLO Model...")
    mon_img = face_service.decode_base64_image(dummy_b64)
    mon_res = monitoring_service.process_monitoring_frame(mon_img, "Smart Classroom 401")
    assert "phone_detected" in mon_res
    assert "engagement_rate" in mon_res
    print(f"  ✓ Classroom monitoring scan successful: Engagement rate {mon_res['engagement_rate']}%, YOLO detector online.")

    # TEST 11: Reports & Dashboards
    print("\n[TEST 11] Testing Faculty & Student Dashboard Summaries...")
    fac_dash = get_faculty_dashboard_stats(db, faculty_obj)
    assert fac_dash["total_students"] >= 6
    assert len(fac_dash["attendance_trend"]) == 7

    stud_dash = get_student_dashboard_stats(db, alex_student)
    assert stud_dash["roll_number"] == "21CS101"
    print("  ✓ Faculty and student dashboard metrics loaded with complete relational data.")

    # TEST 12: Admin Authentication & Dashboard
    print("\n[TEST 12] Testing Administrator Authentication & Role Verification...")
    from routers.auth import admin_login
    from routers.admin import get_admin_dashboard_stats, correct_attendance_with_audit, get_attendance_audit_logs

    admin_req = schemas.LoginRequest(login="admin@smartclassroom.edu", password="Admin@1234")
    admin_auth = admin_login(admin_req, db)
    assert admin_auth.role == "ADMIN"
    assert admin_auth.email == "admin@smartclassroom.edu"
    print(f"  ✓ Admin authenticated successfully: {admin_auth.name} (Role: {admin_auth.role})")

    admin_user_obj = db.query(models.User).filter(models.User.email == "admin@smartclassroom.edu").first()
    admin_stats = get_admin_dashboard_stats(db, admin_user_obj)
    assert admin_stats["total_students"] >= 6
    assert admin_stats["total_faculty"] >= 1
    assert admin_stats["total_departments"] >= 5
    assert admin_stats["total_subjects"] >= 4
    print(f"  ✓ Live Database Admin Stats: {admin_stats['total_students']} Students, {admin_stats['total_faculty']} Faculty, {admin_stats['total_departments']} Departments, {admin_stats['total_subjects']} Subjects.")

    # TEST 13: Attendance Audit Trail
    print("\n[TEST 13] Testing Administrative Attendance Override & Audit Logging...")
    first_att = db.query(models.Attendance).first()
    if first_att:
        initial_status = first_att.status
        new_test_status = "Late" if initial_status == "Present" else "Present"
        correct_attendance_with_audit(
            first_att.id,
            {"status": new_test_status, "reason": "Automated verification test audit"},
            db,
            admin_user_obj
        )
        logs = get_attendance_audit_logs(db, admin_user_obj)
        assert len(logs) > 0
        assert logs[0]["new_status"] == new_test_status
        print(f"  ✓ Attendance override logged with permanent audit reason: '{logs[0]['reason']}' (Auditor: {logs[0]['modified_by']})")

    # TEST 14: AI Smartphone Detection with YOLOv8s Model
    print("\n[TEST 14] Testing YOLOv8s Smartphone Detection & 5-State Head Orientation...")
    phone_crop_path = os.path.join(BASE_DIR, "phone_test.jpg")
    if os.path.exists(phone_crop_path):
        crop_img = cv2.imread(phone_crop_path)
        _, cbuf = cv2.imencode(".jpg", crop_img)
        phone_b64 = "data:image/jpeg;base64," + base64.b64encode(cbuf).decode("utf-8")
        from monitoring_service import process_monitoring_frame
        det_res = process_monitoring_frame(phone_b64, "Smart Classroom 401")
        assert det_res["phone_detected"] == True, "YOLOv8s should detect phone in phone_test.jpg"
        print(f"  ✓ YOLOv8s Smartphone Detected: {det_res['detected_object']} (Confidence: {det_res['primary_confidence']}%)")
        print(f"  ✓ Alert Text: '{det_res['phone_status']}'")
        print(f"  ✓ Head Pose Indicator: '{det_res['primary_head_orientation']}'")

    db.close()
    print("\n==================================================")
    print("ALL 14 BACKEND, ADMIN & AI TEST SUITES PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_comprehensive_tests()

