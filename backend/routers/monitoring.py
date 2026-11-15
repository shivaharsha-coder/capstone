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
        self.session_rooms: Dict[str, List[WebSocket]] = {}
        self.connection_meta: Dict[WebSocket, Dict[str, Any]] = {}
        self.screen_frames: Dict[str, str] = {}  # session_id -> base64 jpeg
        self.latest_frame: Optional[str] = None
        self.latest_frame_session: Optional[str] = None
        self.latest_frame_time: Optional[datetime] = None

    async def connect(self, websocket: WebSocket, session_id: Optional[str] = None, role: str = "GUEST"):
        await websocket.accept()
        self.active_connections.append(websocket)
        room = session_id or "default"
        self.connection_meta[websocket] = {"session_id": room, "role": role}
        if room not in self.session_rooms:
            self.session_rooms[room] = []
        self.session_rooms[room].append(websocket)

        # Deliver current screen frame if active
        frame = self.screen_frames.get(room) or self.screen_frames.get("latest") or self.latest_frame
        if frame:
            try:
                await websocket.send_json({
                    "type": "SCREEN_SHARE_FRAME",
                    "session_id": room,
                    "frame": frame,
                    "is_sharing": True
                })
            except Exception:
                pass

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        meta = self.connection_meta.pop(websocket, None)
        if meta:
            room = meta.get("session_id", "default")
            if room in self.session_rooms and websocket in self.session_rooms[room]:
                self.session_rooms[room].remove(websocket)

    async def join_room(self, websocket: WebSocket, session_id: str, role: str = "GUEST"):
        meta = self.connection_meta.get(websocket, {})
        old_room = meta.get("session_id")
        if old_room and old_room in self.session_rooms and websocket in self.session_rooms[old_room]:
            self.session_rooms[old_room].remove(websocket)

        meta["session_id"] = session_id
        meta["role"] = role
        self.connection_meta[websocket] = meta

        if session_id not in self.session_rooms:
            self.session_rooms[session_id] = []
        if websocket not in self.session_rooms[session_id]:
            self.session_rooms[session_id].append(websocket)

        # Immediately send active screen share frame to newly joined member
        frame = self.screen_frames.get(session_id) or self.screen_frames.get("latest") or self.latest_frame
        if frame:
            try:
                await websocket.send_json({
                    "type": "SCREEN_SHARE_FRAME",
                    "session_id": session_id,
                    "frame": frame,
                    "is_sharing": True
                })
            except Exception:
                pass

    async def broadcast(self, data: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)

    async def broadcast_to_session(self, session_id: str, data: dict):
        targets = list(self.session_rooms.get(session_id, []))
        # Include admins or global monitors
        for ws in list(self.active_connections):
            meta = self.connection_meta.get(ws, {})
            if meta.get("role") == "ADMIN" and ws not in targets:
                targets.append(ws)

        for connection in targets:
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)


monitoring_manager = MonitoringConnectionManager()


@router.websocket("/ws")
async def websocket_monitoring_endpoint(
    websocket: WebSocket,
    session_id: Optional[str] = None,
    role: Optional[str] = "GUEST"
):
    """Real-time WebSocket feed with room-based session isolation and live screen share support."""
    await monitoring_manager.connect(websocket, session_id=session_id, role=role)
    try:
        while True:
            text = await websocket.receive_text()
            try:
                import json
                msg = json.loads(text)
                msg_type = msg.get("type")
                target_session = msg.get("session_id") or session_id or "default"

                if msg_type == "JOIN_SESSION":
                    req_session = msg.get("session_id") or "default"
                    req_role = msg.get("role") or "GUEST"
                    await monitoring_manager.join_room(websocket, req_session, req_role)

                elif msg_type == "SCREEN_SHARE_STARTED":
                    await monitoring_manager.broadcast_to_session(target_session, {
                        "type": "SCREEN_SHARE_STARTED",
                        "session_id": target_session,
                        "faculty_name": msg.get("faculty_name", "Faculty")
                    })

                elif msg_type == "SCREEN_SHARE_FRAME":
                    frame_data = msg.get("frame")
                    if frame_data:
                        monitoring_manager.screen_frames[target_session] = frame_data
                        monitoring_manager.screen_frames["latest"] = frame_data
                        monitoring_manager.latest_frame = frame_data
                        monitoring_manager.latest_frame_session = target_session
                        monitoring_manager.latest_frame_time = datetime.utcnow()

                        payload_out = {
                            "type": "SCREEN_SHARE_FRAME",
                            "session_id": target_session,
                            "frame": frame_data,
                            "is_sharing": True
                        }
                        await monitoring_manager.broadcast_to_session(target_session, payload_out)
                        if "default" in monitoring_manager.session_rooms and target_session != "default":
                            for ws in list(monitoring_manager.session_rooms.get("default", [])):
                                try:
                                    await ws.send_json(payload_out)
                                except Exception:
                                    pass

                elif msg_type == "SCREEN_SHARE_STOPPED":
                    monitoring_manager.screen_frames.pop(target_session, None)
                    if monitoring_manager.latest_frame_session == target_session:
                        monitoring_manager.latest_frame = None
                        monitoring_manager.latest_frame_session = None
                    stop_payload = {
                        "type": "SCREEN_SHARE_STOPPED",
                        "session_id": target_session
                    }
                    await monitoring_manager.broadcast_to_session(target_session, stop_payload)
                    if "default" in monitoring_manager.session_rooms and target_session != "default":
                        for ws in list(monitoring_manager.session_rooms.get("default", [])):
                            try:
                                await ws.send_json(stop_payload)
                            except Exception:
                                pass

            except Exception:
                pass
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

    # 2. Normal classroom engagement & note-taking orientation:
    # Gentle real-time tracking without generating disruptive alarm tickets or notification spam
    elif student_obj and (not is_attentive or head_orientation in ["Facing Left", "Facing Right", "Looking Down", "Looking Up", "Facing Away", "Head Tilted"]):
        # Do not spam database with distraction tickets for natural note-taking / typing
        pass

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
def get_active_class_session(
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns the current state of live class meeting for student and faculty synchronisation."""
    if session_id:
        sess = db.query(models.ClassroomSession).filter(
            models.ClassroomSession.session_code == session_id,
            models.ClassroomSession.status == "ACTIVE"
        ).first()
        if sess:
            return {
                "is_active": True,
                "session_id": sess.session_code,
                "title": sess.title,
                "subject_code": sess.subject_code,
                "faculty_name": sess.faculty_name,
                "faculty_user_id": sess.faculty_user_id,
                "faculty_id": sess.faculty_id,
                "classroom_name": sess.classroom_name,
                "is_screen_sharing": sess.is_screen_sharing,
                "start_time": sess.started_at.isoformat() if sess.started_at else None
            }

    # Check for active DB session first
    active_db = db.query(models.ClassroomSession).filter(
        models.ClassroomSession.status == "ACTIVE"
    ).order_by(models.ClassroomSession.started_at.desc()).first()

    if active_db:
        return {
            "is_active": True,
            "session_id": active_db.session_code,
            "title": active_db.title,
            "subject_code": active_db.subject_code,
            "faculty_name": active_db.faculty_name,
            "faculty_user_id": active_db.faculty_user_id,
            "faculty_id": active_db.faculty_id,
            "classroom_name": active_db.classroom_name,
            "is_screen_sharing": active_db.is_screen_sharing,
            "start_time": active_db.started_at.isoformat() if active_db.started_at else None
        }

    return _active_class_session


@router.get("/active-sessions")
def get_all_active_class_sessions(db: Session = Depends(get_db)):
    """Returns list of all active online classroom sessions across all faculty members."""
    active_sessions = db.query(models.ClassroomSession).filter(
        models.ClassroomSession.status == "ACTIVE"
    ).order_by(models.ClassroomSession.started_at.desc()).all()

    results = []
    for s in active_sessions:
        results.append({
            "id": s.id,
            "session_id": s.session_code,
            "session_code": s.session_code,
            "title": s.title,
            "subject_code": s.subject_code,
            "faculty_name": s.faculty_name,
            "faculty_id": s.faculty_id,
            "classroom_name": s.classroom_name,
            "is_screen_sharing": s.is_screen_sharing,
            "attending_count": s.attending_count,
            "started_at": s.started_at.strftime("%I:%M %p") if s.started_at else "Now"
        })

    # If no DB session, fallback to in-memory if active
    if not results and _active_class_session.get("is_active"):
        results.append({
            "id": 1,
            "session_id": "SES-MAIN-001",
            "session_code": "SES-MAIN-001",
            "title": _active_class_session.get("title"),
            "subject_code": _active_class_session.get("subject_code"),
            "faculty_name": _active_class_session.get("faculty_name"),
            "classroom_name": _active_class_session.get("classroom_name"),
            "is_screen_sharing": False,
            "attending_count": len(_live_students),
            "started_at": "Just now"
        })

    return results


@router.get("/student-enrolled-courses")
def get_student_enrolled_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns all registered courses for the current student, including real-time
    active meeting status, faculty details, and screen sharing state for each course.
    """
    # 1. Identify student
    student = None
    if current_user.role == "STUDENT":
        student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()

    # If student exists, fetch enrollments; if admin/faculty testing, return all subjects
    if student:
        enrollments = db.query(models.Enrollment).filter(models.Enrollment.student_id == student.id).all()
        subjects = [e.subject for e in enrollments if e.subject]
        # In case student has no enrollments yet, fallback to all subjects in their department
        if not subjects and student.department:
            subjects = db.query(models.Subject).filter(models.Subject.department == student.department).all()
    else:
        subjects = db.query(models.Subject).all()

    # If still empty, return all subjects
    if not subjects:
        subjects = db.query(models.Subject).all()

    # Fetch all currently active sessions from database
    active_sessions = db.query(models.ClassroomSession).filter(
        models.ClassroomSession.status == "ACTIVE"
    ).all()
    active_by_subj_code = {s.subject_code: s for s in active_sessions if s.subject_code}
    active_by_subj_id = {s.subject_id: s for s in active_sessions if s.subject_id}

    courses_list = []
    for subj in subjects:
        # Check faculty assigned
        fac_name = "Faculty Instructor"
        if subj.faculty and subj.faculty.user:
            fac_name = subj.faculty.user.full_name

        # Check if an active session exists for this subject
        active_sess = active_by_subj_id.get(subj.id) or active_by_subj_code.get(subj.code)
        
        # Check if fallback in-memory matches this subject
        is_mem_active = (_active_class_session.get("is_active") and 
                         (_active_class_session.get("subject_code") == subj.code or 
                          _active_class_session.get("title", "").startswith(subj.code)))

        is_sharing = False
        sess_code = None
        sess_title = None
        classroom = "Smart Classroom 401"
        is_live = False

        if active_sess:
            is_live = True
            sess_code = active_sess.session_code
            sess_title = active_sess.title
            classroom = active_sess.classroom_name
            is_sharing = bool(active_sess.is_screen_sharing or (sess_code in monitoring_manager.screen_frames) or ("latest" in monitoring_manager.screen_frames))
            fac_name = active_sess.faculty_name or fac_name
        elif is_mem_active:
            is_live = True
            sess_code = _active_class_session.get("session_id", "default")
            sess_title = _active_class_session.get("title")
            classroom = _active_class_session.get("classroom_name", "Smart Classroom 401")
            is_sharing = bool(sess_code in monitoring_manager.screen_frames or "latest" in monitoring_manager.screen_frames)

        courses_list.append({
            "subject_id": subj.id,
            "code": subj.code,
            "name": subj.name,
            "department": subj.department,
            "faculty_name": fac_name,
            "classroom_name": classroom,
            "is_live": is_live,
            "is_screen_sharing": is_sharing,
            "session_id": sess_code,
            "session_title": sess_title or f"{subj.code} - {subj.name} ({fac_name})",
        })

    # Total live meetings count
    live_count = sum(1 for c in courses_list if c["is_live"])

    return {
        "success": True,
        "courses": courses_list,
        "total_enrolled": len(courses_list),
        "live_meetings_count": live_count,
        "any_active_meeting": live_count > 0 or len(active_sessions) > 0,
        "active_sessions": [
            {
                "session_code": s.session_code,
                "title": s.title,
                "subject_code": s.subject_code,
                "faculty_name": s.faculty_name,
                "classroom_name": s.classroom_name,
                "is_screen_sharing": s.is_screen_sharing
            } for s in active_sessions
        ]
    }


@router.get("/faculty-courses")
def get_faculty_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns courses assigned to faculty for streamlined meeting launch."""
    subjects = db.query(models.Subject).all()
    results = []
    for s in subjects:
        fac_name = s.faculty.user.full_name if s.faculty and s.faculty.user else "Unassigned"
        is_mine = False
        if current_user.role == "FACULTY" and s.faculty and s.faculty.user_id == current_user.id:
            is_mine = True
        results.append({
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "department": s.department,
            "faculty_name": fac_name,
            "faculty_id": s.faculty_id,
            "is_assigned_to_current_user": is_mine
        })
    return results


@router.post("/start-session")
async def start_class_session(
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Faculty starts live class meeting with a persistent session ID and room."""
    global _active_class_session
    faculty_name = current_user.full_name if current_user.role == "FACULTY" else "Dr. Rajesh Sharma"

    title = (payload.get("title") if payload else None) or "CS501 - Computer Networks"
    subject = (payload.get("subject_code") if payload else None) or "CS501"
    classroom = (payload.get("classroom_name") if payload else None) or "Smart Classroom 401"
    subject_id = (payload.get("subject_id") if payload else None)

    faculty_id = current_user.faculty_profile.id if getattr(current_user, "faculty_profile", None) else None

    # Generate unique session code
    clean_sub = "".join([c for c in subject if c.isalnum()]).upper() or "CLS"
    session_code = f"SES-{clean_sub}-{uuid.uuid4().hex[:6].upper()}"

    # Create database record for the session
    new_sess = models.ClassroomSession(
        session_code=session_code,
        title=title,
        subject_id=subject_id,
        subject_code=subject,
        faculty_id=faculty_id,
        faculty_user_id=current_user.id,
        faculty_name=faculty_name,
        classroom_name=classroom,
        status="ACTIVE",
        is_screen_sharing=False,
        started_at=datetime.utcnow()
    )
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)

    _active_class_session = {
        "is_active": True,
        "session_id": session_code,
        "session_code": session_code,
        "title": title,
        "subject_code": subject,
        "faculty_name": faculty_name,
        "faculty_user_id": current_user.id,
        "faculty_id": faculty_id,
        "classroom_name": classroom,
        "start_time": new_sess.started_at.isoformat()
    }

    try:
        await monitoring_manager.broadcast({
            "type": "CLASS_SESSION_STARTED",
            "session": _active_class_session,
            "session_id": session_code
        })
    except Exception as e:
        print(f"Broadcast error on start-session: {e}")

    return {"success": True, "session": _active_class_session, "session_id": session_code}


@router.post("/end-session")
async def end_class_session(
    payload: schemas.SaveSessionVideoRequest,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    """Faculty ends live class meeting and archives recorded video into Admin Portal."""
    global _active_class_session
    _active_class_session["is_active"] = False

    # Mark active session as COMPLETED in database
    target_code = session_id or _active_class_session.get("session_id")
    if target_code:
        db_sess = db.query(models.ClassroomSession).filter(
            models.ClassroomSession.session_code == target_code
        ).first()
        if db_sess:
            db_sess.status = "COMPLETED"
            db_sess.ended_at = datetime.utcnow()
            db_sess.is_screen_sharing = False
            db.commit()

    # Clear screen frame for this session
    monitoring_manager.screen_frames.pop(target_code or "default", None)

    # Save session video into database
    save_result = await save_session_video(payload, db, current_user)

    try:
        await monitoring_manager.broadcast({
            "type": "CLASS_SESSION_ENDED",
            "session_id": target_code,
            "video": save_result["video"]
        })
    except Exception as e:
        print(f"Broadcast error on end-session: {e}")

    return {
        "success": True,
        "message": "Class meeting ended and video published to Admin Portal.",
        "video": save_result["video"]
    }


# =========================================================================
# LIVE SCREEN SHARING BROADCAST ENDPOINTS
# =========================================================================

@router.post("/screen-share/frame")
async def post_screen_share_frame(
    payload: schemas.ScreenShareFrameRequest,
    current_user: models.User = Depends(get_current_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Receives screen share frame from faculty and broadcasts to students in session."""
    session_id = payload.session_id or _active_class_session.get("session_id") or "default"

    # Cache frame in memory for both session and latest fallback
    monitoring_manager.screen_frames[session_id] = payload.frame_base64
    monitoring_manager.screen_frames["latest"] = payload.frame_base64
    monitoring_manager.latest_frame = payload.frame_base64
    monitoring_manager.latest_frame_session = session_id
    monitoring_manager.latest_frame_time = datetime.utcnow()

    # Update session status in DB if session exists
    if session_id != "default":
        db_sess = db.query(models.ClassroomSession).filter(
            models.ClassroomSession.session_code == session_id
        ).first()
        if db_sess and not db_sess.is_screen_sharing:
            db_sess.is_screen_sharing = True
            db.commit()

    # Broadcast to students in that session room & default room
    payload_out = {
        "type": "SCREEN_SHARE_FRAME",
        "session_id": session_id,
        "frame": payload.frame_base64,
        "is_sharing": True
    }
    await monitoring_manager.broadcast_to_session(session_id, payload_out)
    if "default" in monitoring_manager.session_rooms and session_id != "default":
        for ws in list(monitoring_manager.session_rooms.get("default", [])):
            try:
                await ws.send_json(payload_out)
            except Exception:
                pass

    return {"success": True}


@router.post("/screen-share/stop")
async def stop_screen_share(
    payload: Optional[dict] = None,
    current_user: models.User = Depends(get_current_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Stops faculty screen sharing session."""
    session_id = (payload.get("session_id") if payload else None) or _active_class_session.get("session_id") or "default"

    monitoring_manager.screen_frames.pop(session_id, None)
    if monitoring_manager.latest_frame_session == session_id:
        monitoring_manager.latest_frame = None
        monitoring_manager.latest_frame_session = None

    if session_id != "default":
        db_sess = db.query(models.ClassroomSession).filter(
            models.ClassroomSession.session_code == session_id
        ).first()
        if db_sess:
            db_sess.is_screen_sharing = False
            db.commit()

    stop_payload = {
        "type": "SCREEN_SHARE_STOPPED",
        "session_id": session_id
    }
    await monitoring_manager.broadcast_to_session(session_id, stop_payload)
    if "default" in monitoring_manager.session_rooms and session_id != "default":
        for ws in list(monitoring_manager.session_rooms.get("default", [])):
            try:
                await ws.send_json(stop_payload)
            except Exception:
                pass

    return {"success": True, "message": "Screen sharing ended."}


@router.get("/screen-share/{session_id}")
def get_current_screen_share(session_id: str):
    """Retrieves current active screen share frame for a session (HTTP fallback for WebSockets)."""
    frame = None
    # 1. Exact key match
    if session_id in monitoring_manager.screen_frames:
        frame = monitoring_manager.screen_frames[session_id]

    # 2. Fuzzy or prefix match
    if not frame:
        for k, v in monitoring_manager.screen_frames.items():
            if k not in ["latest", "default"] and (session_id in k or k in session_id):
                frame = v
                break

    # 3. Fallback to latest active frame
    if not frame and monitoring_manager.latest_frame:
        frame = monitoring_manager.latest_frame

    return {
        "session_id": session_id,
        "is_sharing": bool(frame is not None),
        "frame": frame
    }






