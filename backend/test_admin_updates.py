import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import SessionLocal
import models
import schemas
from routers.auth import admin_register, admin_login
from routers.admin import (
    get_class_session_videos,
    delete_class_session_video,
    get_all_monitoring_alerts,
    delete_monitoring_alert
)

def run_tests():
    print("==================================================")
    print("TESTING ADMIN REGISTRATION & VISION ARCHIVES")
    print("==================================================")
    db = SessionLocal()

    # 1. Clean up any previous test user
    email = "anirudh@smartclass.edu.in"
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        db.delete(existing)
        db.commit()

    # 2. Test Admin Registration
    print("\n[TEST 1] Testing Admin Registration endpoint...")
    reg_req = schemas.AdminRegisterRequest(
        full_name="Dr. Anirudh Sharma",
        email=email,
        username="anirudh",
        password="Password@123",
        confirm_password="Password@123",
        department="Central Administration"
    )
    reg_res = admin_register(reg_req, db)
    assert reg_res.role == "ADMIN"
    assert reg_res.email == email
    assert reg_res.access_token is not None
    print(f"  ✓ Admin Registered successfully: {reg_res.name} (Role: {reg_res.role}, Dept: {reg_res.department})")

    # 3. Test Admin Login with the newly created account
    print("\n[TEST 2] Testing Admin Login with new credentials...")
    login_req = schemas.LoginRequest(
        login=email,
        password="Password@123"
    )
    login_res = admin_login(login_req, db)
    assert login_res.role == "ADMIN"
    assert login_res.email == email
    print(f"  ✓ Admin Login successful for {login_res.name} ({login_res.email})")

    admin_user = db.query(models.User).filter(models.User.email == email).first()

    # 4. Test Class Session Videos Archive
    print("\n[TEST 3] Testing Get Class Session Videos...")
    videos = get_class_session_videos(db, admin_user)
    print(f"  ✓ Retrieved {len(videos)} recorded class session videos.")
    assert len(videos) > 0, "Expected at least 1 video"
    first_vid = videos[0]
    print(f"    - Title: {first_vid['title']}")
    print(f"    - Classroom: {first_vid['classroom_name']}")
    print(f"    - Faculty: {first_vid['faculty_name']}")
    print(f"    - Duration: {first_vid['duration']}, Size: {first_vid['file_size']}")

    # 5. Test Delete Class Session Video
    print("\n[TEST 4] Testing Delete Class Session Video...")
    # Add a temporary video to delete
    temp_vid = models.ClassSessionVideo(
        title="Temporary Delete Test Lecture",
        classroom_name="Test Room",
        video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    )
    db.add(temp_vid)
    db.commit()
    db.refresh(temp_vid)
    temp_id = temp_vid.id

    del_res = delete_class_session_video(temp_id, db, admin_user)
    assert del_res["success"] == True
    # Confirm it's gone
    assert db.query(models.ClassSessionVideo).filter(models.ClassSessionVideo.id == temp_id).first() is None
    print(f"  ✓ Successfully deleted video ID {temp_id} from database.")

    # 6. Test Get Classroom Vision Alerts
    print("\n[TEST 5] Testing Classroom Vision History & Alerts...")
    alerts = get_all_monitoring_alerts(db, admin_user)
    print(f"  ✓ Retrieved {len(alerts)} classroom vision history records.")

    # 7. Test Delete Classroom Vision Record
    print("\n[TEST 6] Testing Delete Classroom Vision Record...")
    temp_alert = models.MonitoringEvent(
        classroom_name="Test Classroom",
        event_type="MOBILE_PHONE",
        confidence=0.88,
        notes="Unwanted vision record test"
    )
    db.add(temp_alert)
    db.commit()
    db.refresh(temp_alert)
    alert_id = temp_alert.id

    del_alert_res = delete_monitoring_alert(alert_id, db, admin_user)
    assert del_alert_res["success"] == True
    assert db.query(models.MonitoringEvent).filter(models.MonitoringEvent.id == alert_id).first() is None
    print(f"  ✓ Successfully deleted vision record ID {alert_id} from database.")

    db.close()
    print("\n==================================================")
    print("ALL TESTS PASSED! ADMIN REGISTRATION & ARCHIVE VERIFIED.")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
