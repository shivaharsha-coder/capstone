import os
import uuid
import random
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import (
    get_current_user,
    get_current_faculty_or_admin,
)
import monitoring_service
import face_service

router = APIRouter(prefix="/api/monitoring", tags=["AI Classroom Monitoring"])

# In-memory registry of live connected students attending class
_live_students: Dict[int, Dict[str, Any]] = {}

# In-memory server-authoritative live class session state
_active_class_session: Dict[str, Any] = {
    "is_active": False,
    "title": "CS501 - Computer Networks (Dr. Rajesh Sharma)",
    "subject_code": "CS501",
    "faculty_name": "Dr. Rajesh Sharma",
    "classroom_name": "Smart Classroom 401",
    "start_time": None
}


class MonitoringConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)


monitoring_manager = MonitoringConnectionManager()


@router.websocket("/ws")
async def websocket_monitoring_endpoint(websocket: WebSocket):
    """Real-time WebSocket feed for classroom monitoring sidebar updates."""
    await monitoring_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; client can send ping or custom messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        monitoring_manager.disconnect(websocket)
    except Exception:
        monitoring_manager.disconnect(websocket)


@router.post("/scan")
@router.post("/process-frame")
@router.post("/student-frame")
async def scan_classroom_frame(
    payload: schemas.MonitoringScanRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Analyzes live camera frame for:
    - Mobile phone usage detection via YOLOv8s
    - Student head orientation & engagement (Facing Forward, Left, Right, Away, Face Not Visible)
    - Records alert with student name and roll number if phone is used or student looks away
    """
    # If student is broadcasting frames but faculty hasn't started the meeting, return inactive notice
    if current_user.role == "STUDENT" and not _active_class_session["is_active"]:
        return {
            "class_active": False,
            "message": "Class meeting has not been started by faculty yet.",
            "phone_detected": False,
            "detected_object": "None",
            "primary_head_orientation": "Face Not Visible",
            "student_status": "Waiting for faculty to start class session",
            "phone_status": "Class meeting not in session."
        }

    img = face_service.decode_base64_image(payload.frame_base64)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid frame data")

    analysis = monitoring_service.process_monitoring_frame(img, payload.classroom_name or "Smart Classroom 401")

    student_obj = current_user.student_profile if current_user.role == "STUDENT" else None
    student_id = student_obj.id if student_obj else None
    student_name = current_user.full_name
    student_roll = student_obj.roll_number if student_obj else "FACULTY/ADMIN"
    student_dept = student_obj.department if student_obj else "Campus"
    student_avatar = current_user.avatar

    # Resolve faculty responsible for this live class session
    faculty_uid = _active_class_session.get("faculty_user_id")
    faculty_id = _active_class_session.get("faculty_id")
    if not faculty_uid:
        # Fallback to the registered faculty in database
        active_fac = db.query(models.Faculty).first()
        if active_fac:
            faculty_id = active_fac.id
            faculty_uid = active_fac.user_id

    # Face Verification & Daily Attendance Consistency (Day 1 vs Day 2 Face Matching)
    face_matched = None
    similarity_pct = 0.0
    attendance_status = "Pending"
    attendance_remarks = ""
    is_proxy_detected = False

    if student_obj:
        face_boxes = analysis.get("face_boxes", [])
        if face_boxes and len(face_boxes) > 0:
            fb = face_boxes[0]
            fx1, fy1, fx2, fy2 = fb[0], fb[1], fb[2], fb[3]
            fw, fh = max(20, fx2 - fx1), max(20, fy2 - fy1)
            current_emb = face_service.extract_face_embedding(img, [fx1, fy1, fw, fh])

            if current_emb:
                db_face = db.query(models.FaceEmbedding).filter(models.FaceEmbedding.student_id == student_id).first()
                if payload.simulate_proxy_mismatch:
                    # Day 2 / Proxy Simulation: Explicit mismatch test
                    similarity = 0.31
                    similarity_pct = 31.0
                    face_matched = False
                elif not db_face:
                    # Day 1: Student attends for the first time -> register baseline face profile
                    db_face = models.FaceEmbedding(
                        student_id=student_id,
                        embedding_data=current_emb,
                        sample_count=1,
                        sample_image_path=analysis.get("snapshot_url")
                    )
                    db.add(db_face)
                    db.commit()
                    db.refresh(db_face)
                    face_matched = True
                    similarity_pct = 100.0
                else:
                    # Day 2 / Subsequent Days: Compare current webcam face with Day 1 baseline
                    similarity = face_service.cosine_similarity(current_emb, db_face.embedding_data)
                    similarity_pct = round(similarity * 100.0, 1)
                    face_matched = bool(similarity >= 0.58)

                # Determine active subject
                subject_id = _active_class_session.get("subject_id")
                if not subject_id:
                    first_sub = db.query(models.Subject).first()
                    subject_id = first_sub.id if first_sub else 1

                today_date_str = datetime.utcnow().strftime("%Y-%m-%d")

                att_record = db.query(models.Attendance).filter(
                    models.Attendance.student_id == student_id,
                    models.Attendance.subject_id == subject_id,
                    models.Attendance.date == today_date_str
                ).first()

                if face_matched:
                    # Face matched Day 1 face -> Student gets attendance: Present
                    attendance_status = "Present"
                    attendance_remarks = f"Face Verified: Matches registered student profile (Similarity: {similarity_pct}%)."
                    if att_record:
                        att_record.status = "Present"
                        att_record.confidence = round(similarity_pct / 100.0, 2)
                        att_record.method = "AI_FACE"
                        att_record.remarks = attendance_remarks
                    else:
                        att_record = models.Attendance(
                            student_id=student_id,
                            subject_id=subject_id,
                            date=today_date_str,
                            status="Present",
                            confidence=round(similarity_pct / 100.0, 2),
                            method="AI_FACE",
                            marked_by="AI Face Verification",
                            remarks=attendance_remarks
                        )
                        db.add(att_record)
                    db.commit()
                else:
                    # Face does NOT match Day 1 face -> Proxy detected! Student CANNOT get attendance: Marked ABSENT!
                    attendance_status = "Absent"
                    is_proxy_detected = True
                    attendance_remarks = f"Proxy Attendance Blocked: Face does not match registered student face from previous attendance (Similarity: {similarity_pct}%). Attendance Marked ABSENT."
                    if att_record:
                        att_record.status = "Absent"
                        att_record.confidence = round(similarity_pct / 100.0, 2)
                        att_record.method = "AI_FACE"
                        att_record.remarks = attendance_remarks
                    else:
                        att_record = models.Attendance(
                            student_id=student_id,
                            subject_id=subject_id,
                            date=today_date_str,
                            status="Absent",
                            confidence=round(similarity_pct / 100.0, 2),
                            method="AI_FACE",
                            marked_by="AI Face Verification",
                            remarks=attendance_remarks
                        )
                        db.add(att_record)
                    db.commit()
        else:
            attendance_status = "Absent (Face Not Visible)"
            attendance_remarks = "No face visible in camera frame."

    head_orientation = analysis.get("primary_head_orientation", "Face Not Visible")
    phone_detected = analysis.get("phone_detected", False)
    is_attentive = analysis.get("is_attentive", True)

    # Determine student status
    if is_proxy_detected or (student_obj and face_matched is False):
        status_label = "❌ Face Mismatch (Proxy - Marked ABSENT)"
    elif phone_detected:
        status_label = "🚨 Using Smartphone"
    elif head_orientation == "Facing Forward" and is_attentive:
        status_label = "Attentive - Watching Class"
    elif head_orientation in ["Facing Left", "Facing Right"]:
        status_label = f"Seeing surroundings ({head_orientation})"
    elif head_orientation in ["Looking Down", "Looking Up"]:
        status_label = f"Not watching screen ({head_orientation})"
    elif head_orientation in ["Facing Away", "Head Tilted"]:
        status_label = f"Inattentive ({head_orientation})"
    else:
        status_label = "Absent / Face Not Visible"

    # 0. If proxy face mismatch detected (Day 1 face != Day 2 face): Block attendance and send urgent alert
    new_event_recorded = None
    if is_proxy_detected:
        recent_proxy = (
            db.query(models.MonitoringEvent)
            .filter(
                models.MonitoringEvent.student_id == student_id,
                models.MonitoringEvent.event_type == "PROXY_ATTENDANCE_MISMATCH",
                models.MonitoringEvent.timestamp >= datetime.utcnow() - timedelta(seconds=20)
            )
            .first()
        )
        if not recent_proxy:
            class_title = _active_class_session.get("title", "Live Online Class")
            event = models.MonitoringEvent(
                event_type="PROXY_ATTENDANCE_MISMATCH",
                confidence=round(1.0 - (similarity_pct / 100.0), 2),
                image_snapshot=analysis.get("snapshot_url"),
                classroom_name=payload.classroom_name or _active_class_session.get("classroom_name", "Smart Classroom 401"),
                faculty_id=faculty_id,
                student_id=student_id,
                is_reviewed=False,
                notes=attendance_remarks
            )
            db.add(event)

            # Urgent faculty notification
            if faculty_uid and faculty_uid != current_user.id:
                fac_notif = models.Notification(
                    user_id=faculty_uid,
                    title=f"🚨 PROXY ATTENDANCE ALERT: {student_name}",
                    message=f"Student {student_name} ({student_roll}) attended live session '{class_title}' with an unmatched face (Similarity: {similarity_pct}%). Daily attendance automatically marked ABSENT.",
                    type="MONITORING",
                    link="/monitoring"
                )
                db.add(fac_notif)

            # Student warning notification
            stud_notif = models.Notification(
                user_id=current_user.id,
                title="❌ Face Verification Failed: Marked ABSENT",
                message=f"Your face does not match your registered attendance face profile (Similarity: {similarity_pct}%). Daily attendance marked ABSENT.",
                type="ATTENDANCE",
                link="/attendance"
            )
            db.add(stud_notif)

            db.commit()
            db.refresh(event)
            analysis["recorded_event_id"] = event.id
            new_event_recorded = event

            # Broadcast urgent proxy alert to faculty dashboard
            try:
                await monitoring_manager.broadcast({
                    "type": "PROXY_ATTENDANCE_ALERT",
                    "data": {
                        "student_id": student_id,
                        "student_name": student_name,
                        "student_roll": student_roll,
                        "student_avatar": student_avatar,
                        "classroom_name": payload.classroom_name or "Smart Classroom 401",
                        "class_title": class_title,
                        "detection_time": datetime.now().strftime("%I:%M:%S %p"),
                        "similarity_pct": similarity_pct,
                        "attendance_status": "Absent",
                        "snapshot_url": analysis.get("snapshot_url"),
                        "message": f"Proxy Attendance Blocked: Unmatched face detected for {student_name} ({student_roll}). Attendance marked ABSENT."
                    }
                })
            except Exception as pe:
                print(f"Error broadcasting proxy alert: {pe}")

    # 1. If smartphone detected: Automatically generate warning signal & send message to faculty
    elif phone_detected:
        top_conf = max([p["confidence"] for p in analysis["phone_detections"]]) if analysis["phone_detections"] else 80.0
        class_title = _active_class_session.get("title", "Live Online Class")

        notes = (
            f"Student {student_name} ({student_roll}) was detected using a mobile phone during live session '{class_title}'."
            if student_obj
            else f"Detected {len(analysis['phone_detections'])} smartphone device(s) in frame."
        )

        event = models.MonitoringEvent(
            event_type="MOBILE_PHONE",
            confidence=top_conf / 100.0,
            image_snapshot=analysis.get("snapshot_url"),
            classroom_name=payload.classroom_name or _active_class_session.get("classroom_name", "Smart Classroom 401"),
            faculty_id=faculty_id,
            student_id=student_id,
            is_reviewed=False,
            notes=notes
        )
        db.add(event)

        # Notify student with immediate warning
        notif = models.Notification(
            user_id=current_user.id,
            title="🚨 Smartphone Usage Warning",
            message=f"Mobile phone usage detected in live session '{class_title}' at {datetime.now().strftime('%I:%M:%S %p')}. Mobile devices are strictly prohibited during online classes. Your faculty instructor has been alerted.",
            type="MONITORING",
            link="/monitoring"
        )
        db.add(notif)

        # Send official warning message to the faculty of that particular live class session
        if faculty_uid and faculty_uid != current_user.id:
            fac_notif = models.Notification(
                user_id=faculty_uid,
                title=f"🚨 URGENT: Student Smartphone Detected ({student_name})",
                message=f"Student {student_name} (Roll: {student_roll}) was detected using a smartphone during your live online class '{class_title}' at {datetime.now().strftime('%I:%M:%S %p')}. An automated warning signal has been dispatched.",
                type="MONITORING",
                link="/monitoring"
            )
            db.add(fac_notif)

        db.commit()
        db.refresh(event)
        analysis["recorded_event_id"] = event.id
        new_event_recorded = event

        # Broadcast specific urgent warning signal to faculty dashboard
        try:
            await monitoring_manager.broadcast({
                "type": "URGENT_FACULTY_PHONE_ALERT",
                "data": {
                    "student_id": student_id,
                    "student_name": student_name,
                    "student_roll": student_roll,
                    "student_avatar": student_avatar,
                    "classroom_name": payload.classroom_name or "Smart Classroom 401",
                    "class_title": class_title,
                    "detection_time": datetime.now().strftime("%I:%M:%S %p"),
                    "primary_confidence": top_conf,
                    "snapshot_url": analysis.get("snapshot_url"),
                    "message": f"Student {student_name} ({student_roll}) was detected using a mobile phone during live session '{class_title}'!"
                }
            })
        except Exception as ue:
            print(f"Error broadcasting urgent faculty phone alert: {ue}")

    # 2. If student is seeing surroundings (distracted looking left/right/down/away), intimate student and log
    elif student_obj and (not is_attentive or head_orientation in ["Facing Left", "Facing Right", "Looking Down", "Looking Up", "Facing Away", "Head Tilted"]):
        # Only log one distraction event every 15 seconds per student to avoid spamming
        recent_distraction = (
            db.query(models.MonitoringEvent)
            .filter(
                models.MonitoringEvent.student_id == student_id,
                models.MonitoringEvent.event_type.in_(["DISTRACTED_LOOKING_AWAY", "DISTRACTED"]),
                models.MonitoringEvent.timestamp >= datetime.utcnow() - timedelta(seconds=15)
            )
            .first()
        )
        if not recent_distraction:
            event = models.MonitoringEvent(
                event_type="DISTRACTED_LOOKING_AWAY",
                confidence=0.85,
                image_snapshot=analysis.get("snapshot_url"),
                classroom_name=payload.classroom_name or _active_class_session.get("classroom_name", "Smart Classroom 401"),
                faculty_id=faculty_id,
                student_id=student_id,
                is_reviewed=False,
                notes=f"Student {student_name} ({student_roll}) is seeing surroundings ({head_orientation}) instead of watching live class."
            )
            db.add(event)

            # Notify active faculty
            if faculty_uid and faculty_uid != current_user.id:
                fac_notif = models.Notification(
                    user_id=faculty_uid,
                    title="⚠️ Student Inattention Alert",
                    message=f"Student {student_name} ({student_roll}) is seeing surroundings ({head_orientation}) instead of watching the live lecture.",
                    type="MONITORING",
                    link="/monitoring"
                )
                db.add(fac_notif)

            db.commit()
            db.refresh(event)
            new_event_recorded = event

    # Broadcast real-time alert event if one was recorded
    if new_event_recorded:
        try:
            alert_broadcast_payload = {
                "id": new_event_recorded.id,
                "timestamp": new_event_recorded.timestamp.strftime("%b %d, %Y %I:%M:%S %p"),
                "formatted_time": new_event_recorded.timestamp.strftime("%I:%M:%S %p"),
                "formatted_date": new_event_recorded.timestamp.strftime("%b %d, %Y"),
                "event_type": new_event_recorded.event_type,
                "confidence": round(new_event_recorded.confidence * 100, 1),
                "classroom_name": new_event_recorded.classroom_name,
                "image_snapshot": new_event_recorded.image_snapshot,
                "student_name": student_name,
                "student_roll": student_roll,
                "student_avatar": student_avatar,
                "is_reviewed": False,
                "notes": new_event_recorded.notes,
                "verification_status": "Faculty Verification Required"
            }
            await monitoring_manager.broadcast({
                "type": "NEW_ALERT",
                "alert": alert_broadcast_payload
            })
        except Exception as be:
            print(f"Error broadcasting new alert: {be}")

    # Update in-memory live students roster if student
    if student_obj:
        _live_students[student_id] = {
            "student_id": student_id,
            "student_name": student_name,
            "student_roll": student_roll,
            "student_dept": student_dept,
            "student_avatar": student_avatar,
            "classroom_name": payload.classroom_name or "Smart Classroom 401",
            "head_orientation": head_orientation,
            "phone_detected": phone_detected,
            "detected_object": analysis.get("detected_object", "None"),
            "confidence": analysis.get("primary_confidence", 0.0),
            "status": status_label,
            "last_seen": datetime.utcnow().isoformat(),
            "detection_time": datetime.now().strftime("%I:%M:%S %p"),
            "face_matched": face_matched,
            "similarity_pct": similarity_pct,
            "attendance_status": attendance_status,
            "is_proxy_detected": is_proxy_detected,
            "remarks": attendance_remarks
        }

    # Attach student info & face verification to analysis payload
    analysis["student_name"] = student_name
    analysis["student_roll"] = student_roll
    analysis["student_status"] = status_label
    analysis["face_verification"] = {
        "face_detected": bool(face_matched is not None),
        "face_matched": face_matched,
        "similarity_pct": similarity_pct,
        "attendance_status": attendance_status,
        "remarks": attendance_remarks,
        "is_proxy_detected": is_proxy_detected
    }

    # Broadcast to active WebSockets in real-time
    try:
        await monitoring_manager.broadcast({
            "type": "STUDENT_MONITORING_TICK" if student_obj else "MONITORING_TICK",
            "data": {
                "student_id": student_id,
                "student_name": student_name,
                "student_roll": student_roll,
                "student_avatar": student_avatar,
                "student_dept": student_dept,
                "classroom_name": payload.classroom_name or "Smart Classroom 401",
                "phone_detected": phone_detected,
                "detected_object": analysis.get("detected_object", "None"),
                "primary_confidence": analysis.get("primary_confidence", 0.0),
                "primary_head_orientation": head_orientation,
                "status": status_label,
                "detection_time": datetime.now().strftime("%I:%M:%S %p"),
                "phone_status": analysis.get("alert_message", "No Smartphone Detected."),
                "snapshot_url": analysis.get("snapshot_url"),
                "face_matched": face_matched,
                "similarity_pct": similarity_pct,
                "attendance_status": attendance_status,
                "is_proxy_detected": is_proxy_detected
            }
        })
    except Exception as e:
        print(f"WebSocket broadcast error: {e}")

    return analysis


@router.get("/live-students")
def get_live_students():
    """Returns all students currently attending live class sessions."""
    now = datetime.utcnow()
    active = []
    for sid, data in list(_live_students.items()):
        try:
            last_dt = datetime.fromisoformat(data["last_seen"])
            if (now - last_dt).total_seconds() < 25:
                active.append(data)
            else:
                _live_students.pop(sid, None)
        except Exception:
            _live_students.pop(sid, None)
    return active


@router.get("/alerts")
def get_monitoring_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Returns past monitoring events and alerts for faculty/admin review with student identification."""
    events = (
        db.query(models.MonitoringEvent)
        .order_by(models.MonitoringEvent.timestamp.desc())
        .limit(60)
        .all()
    )

    results = []
    for e in events:
        results.append({
            "id": e.id,
            "timestamp": e.timestamp.strftime("%b %d, %Y %I:%M:%S %p"),
            "formatted_time": e.timestamp.strftime("%I:%M:%S %p"),
            "formatted_date": e.timestamp.strftime("%b %d, %Y"),
            "event_type": e.event_type,
            "confidence": round(e.confidence * 100, 1),
            "classroom_name": e.classroom_name,
            "image_snapshot": e.image_snapshot,
            "student_name": e.student.user.full_name if e.student and e.student.user else "Classroom Camera",
            "student_roll": e.student.roll_number if e.student else "N/A",
            "student_avatar": e.student.user.avatar if e.student and e.student.user else None,
            "is_reviewed": e.is_reviewed,
            "notes": e.notes,
            "verification_status": "Reviewed" if e.is_reviewed else "Faculty Verification Required"
        })
    return results


@router.put("/alerts/{event_id}/review")
def review_monitoring_alert(
    event_id: int,
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    event = db.query(models.MonitoringEvent).filter(models.MonitoringEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Alert event not found")

    event.is_reviewed = True
    notes = payload.get("notes") if payload else f"Reviewed and verified by {current_user.full_name}"
    event.notes = notes
    db.commit()

    return {"success": True, "message": "Alert status updated to reviewed."}


@router.get("/videos")
def get_monitoring_session_videos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Returns recorded class session videos for faculty and admin monitoring view."""
    videos = (
        db.query(models.ClassSessionVideo)
        .order_by(models.ClassSessionVideo.recorded_at.desc())
        .limit(40)
        .all()
    )
    return [
        {
            "id": v.id,
            "title": v.title,
            "classroom_name": v.classroom_name,
            "subject_code": v.subject_code,
            "faculty_name": v.faculty_name,
            "video_url": v.video_url,
            "thumbnail_url": v.thumbnail_url,
            "duration": v.duration,
            "file_size": v.file_size,
            "distractions_flagged": v.distractions_flagged,
            "mobile_alerts_flagged": v.mobile_alerts_flagged,
            "recorded_at": v.recorded_at.strftime("%b %d, %Y %I:%M %p") if v.recorded_at else "Just now"
        }
        for v in videos
    ]


@router.post("/upload-recording")
async def upload_session_recording(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Stores recorded class meeting video chunks on server."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    recordings_dir = os.path.join(base_dir, "uploads", "recordings")
    os.makedirs(recordings_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1] or ".webm"
    unique_name = f"lecture_{uuid.uuid4().hex[:8]}{ext}"
    target_path = os.path.join(recordings_dir, unique_name)

    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)

    size_mb = round(len(content) / (1024 * 1024), 1)
    file_size_str = f"{size_mb} MB" if size_mb >= 1 else f"{round(len(content)/1024)} KB"

    return {
        "video_url": f"/uploads/recordings/{unique_name}",
        "file_size": file_size_str
    }


@router.post("/save-session-video")
async def save_session_video(
    payload: schemas.SaveSessionVideoRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """
    Saves a completed faculty class or meeting session into the database archives,
    and broadcasts in real-time so it immediately displays in the Admin Portal.
    """
    faculty_name = current_user.full_name if current_user.role == "FACULTY" else "Faculty In-Charge"

    default_videos = [
        ("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"),
        ("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60"),
        ("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=60"),
        ("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60"),
    ]
    chosen_default = random.choice(default_videos)
    video_url = payload.video_url or chosen_default[0]
    thumbnail_url = payload.thumbnail_url or chosen_default[1]

    session_video = models.ClassSessionVideo(
        title=payload.title,
        classroom_name=payload.classroom_name or "Smart Classroom 401",
        subject_code=payload.subject_code or "CS501",
        faculty_name=faculty_name,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        duration=payload.duration or "45 mins",
        file_size=payload.file_size or "135 MB",
        distractions_flagged=payload.distractions_flagged or 0,
        mobile_alerts_flagged=payload.mobile_alerts_flagged or 0,
        recorded_at=datetime.utcnow()
    )
    db.add(session_video)
    db.commit()
    db.refresh(session_video)

    video_data = {
        "id": session_video.id,
        "title": session_video.title,
        "classroom_name": session_video.classroom_name,
        "subject_code": session_video.subject_code,
        "faculty_name": session_video.faculty_name,
        "video_url": session_video.video_url,
        "thumbnail_url": session_video.thumbnail_url,
        "duration": session_video.duration,
        "file_size": session_video.file_size,
        "distractions_flagged": session_video.distractions_flagged,
        "mobile_alerts_flagged": session_video.mobile_alerts_flagged,
        "recorded_at": session_video.recorded_at.strftime("%b %d, %Y %I:%M %p")
    }

    # Broadcast to Admin via WebSocket in real-time
    try:
        await monitoring_manager.broadcast({
            "type": "NEW_SESSION_VIDEO",
            "video": video_data
        })
    except Exception as e:
        print(f"Broadcast error on session video: {e}")

    return {
        "success": True,
        "message": f"Class session video '{session_video.title}' recorded and published to Admin Portal.",
        "video": video_data
    }


@router.get("/active-session")
def get_active_class_session():
    """Returns the current state of live class meeting for student and faculty synchronisation."""
    return _active_class_session


@router.post("/start-session")
async def start_class_session(
    payload: Optional[dict] = None,
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Faculty starts live class meeting."""
    global _active_class_session
    faculty_name = current_user.full_name if current_user.role == "FACULTY" else "Dr. Rajesh Sharma"

    title = (payload.get("title") if payload else None) or "CS501 - Computer Networks"
    subject = (payload.get("subject_code") if payload else None) or "CS501"
    classroom = (payload.get("classroom_name") if payload else None) or "Smart Classroom 401"

    faculty_id = current_user.faculty_profile.id if getattr(current_user, "faculty_profile", None) else None

    _active_class_session = {
        "is_active": True,
        "title": title,
        "subject_code": subject,
        "faculty_name": faculty_name,
        "faculty_user_id": current_user.id,
        "faculty_id": faculty_id,
        "classroom_name": classroom,
        "start_time": datetime.utcnow().isoformat()
    }

    try:
        await monitoring_manager.broadcast({
            "type": "CLASS_SESSION_STARTED",
            "session": _active_class_session
        })
    except Exception as e:
        print(f"Broadcast error on start-session: {e}")

    return {"success": True, "session": _active_class_session}


@router.post("/end-session")
async def end_class_session(
    payload: schemas.SaveSessionVideoRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Faculty ends live class meeting and archives recorded video into Admin Portal."""
    global _active_class_session
    _active_class_session["is_active"] = False
    _live_students.clear()

    # Save session video into database
    save_result = await save_session_video(payload, db, current_user)

    try:
        await monitoring_manager.broadcast({
            "type": "CLASS_SESSION_ENDED",
            "video": save_result["video"]
        })
    except Exception as e:
        print(f"Broadcast error on end-session: {e}")

    return {
        "success": True,
        "message": "Class meeting ended and video published to Admin Portal.",
        "video": save_result["video"]
    }





