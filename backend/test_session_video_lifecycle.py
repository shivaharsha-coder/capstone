import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import asyncio
from database import SessionLocal
import models
import schemas
from routers.monitoring import (
    get_active_class_session,
    start_class_session,
    end_class_session,
    scan_classroom_frame,
    _active_class_session
)
from routers.admin import get_class_session_videos, get_all_monitoring_alerts

async def main():
    print("==================================================", flush=True)
    print("TESTING FULL CLASS MEETING LIFECYCLE & PERMISSIONS", flush=True)
    print("==================================================", flush=True)
    db = SessionLocal()

    faculty_user = db.query(models.User).filter(models.User.role == "FACULTY").first()
    student_user = db.query(models.User).filter(models.User.role == "STUDENT").first()
    admin_user = db.query(models.User).filter(models.User.role == "ADMIN").first()

    assert faculty_user and student_user and admin_user

    # 1. Initially class meeting is NOT active
    _active_class_session["is_active"] = False
    init_state = get_active_class_session()
    print(f"\n[TEST 1] Initial Session Active Status: {init_state['is_active']} (Expected: False)", flush=True)
    assert init_state["is_active"] == False

    # 2. Student tries to send frame before class started -> rejected with inactive notice
    dummy_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    scan_req = schemas.MonitoringScanRequest(frame_base64=dummy_b64, classroom_name="Smart Classroom 401")
    student_check = await scan_classroom_frame(scan_req, db, student_user)
    print(f"\n[TEST 2] Student Frame Before Meeting Started: class_active={student_check.get('class_active')}", flush=True)
    assert student_check.get("class_active") == False
    print(f"  ✓ Student correctly blocked with notice: '{student_check.get('message')}'")

    # 3. Faculty starts the class meeting
    print("\n[TEST 3] Faculty Starts Live Class Meeting...", flush=True)
    start_res = await start_class_session(
        {"title": "CS501: Socket Programming Live Lecture", "subject_code": "CS501", "classroom_name": "Smart Classroom 401"},
        faculty_user
    )
    assert start_res["success"] == True
    active_now = get_active_class_session()
    assert active_now["is_active"] == True
    print(f"  ✓ Class meeting is now ACTIVE: '{active_now['title']}' by {active_now['faculty_name']}")

    # 4. Student can now join and broadcast frames
    print("\n[TEST 4] Student Broadcasts Frame During Active Meeting...", flush=True)
    # create a black image to encode
    import numpy as np
    import cv2
    import base64
    blk = np.zeros((240, 320, 3), dtype=np.uint8)
    _, buf = cv2.imencode('.jpg', blk)
    blk_b64 = "data:image/jpeg;base64," + base64.b64encode(buf).decode('utf-8')
    scan_req2 = schemas.MonitoringScanRequest(frame_base64=blk_b64, classroom_name="Smart Classroom 401")
    student_active_scan = await scan_classroom_frame(scan_req2, db, student_user)
    assert "primary_head_orientation" in student_active_scan
    print(f"  ✓ Frame accepted & analyzed: orientation={student_active_scan['primary_head_orientation']}")

    # 5. Faculty ends the meeting and saves recorded video
    print("\n[TEST 5] Faculty Ends Meeting & Archives Video...", flush=True)
    end_payload = schemas.SaveSessionVideoRequest(
        title="CS501: Socket Programming Live Lecture Recording",
        classroom_name="Smart Classroom 401",
        subject_code="CS501",
        duration="45 mins",
        file_size="160 MB",
        distractions_flagged=2,
        mobile_alerts_flagged=1
    )
    end_res = await end_class_session(end_payload, db, faculty_user)
    assert end_res["success"] == True
    after_end = get_active_class_session()
    assert after_end["is_active"] == False
    print(f"  ✓ Class meeting marked INACTIVE: session concluded.")

    # 6. Admin Portal confirms receipt of new video
    print("\n[TEST 6] Admin Portal Fetches Recorded Class Sessions...", flush=True)
    admin_videos = get_class_session_videos(db, admin_user)
    saved_vids = [v for v in admin_videos if v["title"] == "CS501: Socket Programming Live Lecture Recording"]
    assert len(saved_vids) >= 1
    print(f"  ✓ Admin Portal successfully has the new meeting recording: '{saved_vids[0]['title']}'")
    print(f"    - Classroom: {saved_vids[0]['classroom_name']}")
    print(f"    - Faculty: {saved_vids[0]['faculty_name']}")
    print(f"    - Duration: {saved_vids[0]['duration']}")

    # 7. Check Admin Alerts & Snapshot URLs
    print("\n[TEST 7] Admin Checks Classroom Vision History & Snapshots...", flush=True)
    admin_alerts = get_all_monitoring_alerts(db, admin_user)
    print(f"  ✓ Retrieved {len(admin_alerts)} vision history records.")
    for alt in admin_alerts[:3]:
        print(f"    - Alert: {alt['event_type']} | Student: {alt['student_name']} | Snapshot: {alt.get('image_snapshot')}")

    db.close()
    print("\n==================================================", flush=True)
    print("ALL TESTS PASSED! FULL MEETING LIFECYCLE VERIFIED.", flush=True)
    print("==================================================", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
