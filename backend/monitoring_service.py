import os
import uuid
from datetime import datetime
from typing import Dict, Any, List
import cv2
import numpy as np
from ultralytics import YOLO

import face_service

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_PATH_S = os.path.join(BASE_DIR, "models_weights", "yolov8s.pt")
YOLO_PATH_N = os.path.join(BASE_DIR, "models_weights", "yolov8n.pt")
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "uploads", "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

# Load YOLO model
_yolo_model = None


def get_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        # Prefer YOLOv8s for superior handheld phone detection accuracy
        if os.path.exists(YOLO_PATH_S):
            _yolo_model = YOLO(YOLO_PATH_S)
            print("Loaded YOLOv8s model for classroom monitoring.")
        elif os.path.exists(YOLO_PATH_N):
            _yolo_model = YOLO(YOLO_PATH_N)
            print("Loaded YOLOv8n model for classroom monitoring.")
    return _yolo_model


def is_ear_or_face_feature(box: List[int], face_boxes: List[List[int]]) -> bool:
    """
    Checks if a candidate bounding box [bx, by, bw, bh] is an ear, sideburn,
    or part of the head/face perimeter rather than an actual smartphone.
    Eliminates false-positive smartphone alerts triggered by human ears.
    """
    bx, by, bw, bh = box
    cx = bx + bw / 2.0
    cy = by + bh / 2.0

    for fb in face_boxes:
        fx, fy, fw, fh = fb

        # Ear region on left lateral side of face
        left_ear_x1 = fx - 0.28 * fw
        left_ear_x2 = fx + 0.20 * fw
        # Ear region on right lateral side of face
        right_ear_x1 = fx + 0.80 * fw
        right_ear_x2 = fx + 1.28 * fw

        ear_y1 = fy + 0.08 * fh
        ear_y2 = fy + 0.70 * fh

        in_left_ear = (left_ear_x1 <= cx <= left_ear_x2) and (ear_y1 <= cy <= ear_y2)
        in_right_ear = (right_ear_x1 <= cx <= right_ear_x2) and (ear_y1 <= cy <= ear_y2)

        # An ear is small relative to the face
        is_small_ear_size = (bw < 0.35 * fw) and (bh < 0.55 * fh)

        if (in_left_ear or in_right_ear) and is_small_ear_size:
            return True

        # Also check if the box is completely inside the face upper region (eyes/nose/cheeks)
        if (fx + 0.15 * fw <= cx <= fx + 0.85 * fw) and (fy + 0.10 * fh <= cy <= fy + 0.70 * fh) and is_small_ear_size:
            return True

    return False


def has_high_skin_ratio(crop: np.ndarray, threshold: float = 0.45) -> bool:
    """
    Computes skin pixel percentage in the cropped candidate box.
    Human ears, cheeks, and necks have high skin ratios (> 45%).
    Real smartphones (glass screen, dark bezel, colored case) have low skin ratios (< 30%).
    """
    if crop is None or crop.size == 0 or crop.shape[0] < 5 or crop.shape[1] < 5:
        return False
    try:
        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        lower = np.array([0, 30, 45], dtype=np.uint8)
        upper = np.array([25, 220, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower, upper)
        skin_count = np.count_nonzero(mask)
        total_pixels = crop.shape[0] * crop.shape[1]
        return (skin_count / float(total_pixels)) >= threshold
    except Exception:
        return False


def process_monitoring_frame(frame_bgr: np.ndarray, classroom_name: str = "Smart Classroom 401") -> Dict[str, Any]:
    """
    Analyzes classroom frame for:
    1. Robust Mobile phone detection with ear false-positive suppression.
    2. Head orientation & engagement indicators via facial landmarks:
       - Facing Forward (Attentive - watching screen)
       - Facing Left / Right (Inattentive - seeing surroundings)
       - Looking Down (Inattentive - looking at desk/surroundings)
       - Looking Up (Inattentive - looking at ceiling)
       - Facing Away (Inattentive - head turned away)
       - Head Tilted (Inattentive - head tilted sideways)
       - Face Not Visible
    Returns detection events, engagement metrics, student guidance, and alert triggers.
    """
    model = get_yolo_model()
    phone_detections = []
    has_phone_alert = False
    snapshot_filename = None
    detection_time_str = datetime.now().strftime("%I:%M:%S %p")

    img_h, img_w = frame_bgr.shape[:2]

    # 1. Face & engagement detection via YuNet (run first for spatial context)
    faces = face_service.detect_faces_in_image(frame_bgr)
    face_boxes_coords = [f["box"] for f in faces]
    engagement_metrics = []
    attentive_count = 0

    for f in faces:
        box = f["box"]
        landmarks = f["landmarks"]
        pose = face_service.calculate_head_pose_indicator(landmarks, box)
        if pose["is_attentive"]:
            attentive_count += 1
        engagement_metrics.append({
            "box": box,
            "head_orientation": pose["orientation"],
            "is_attentive": pose["is_attentive"],
            "yaw_ratio": pose["yaw_ratio"],
            "tilt_angle": pose["tilt_angle"],
            "pitch_ratio": pose.get("pitch_ratio", 1.0),
            "guidance": pose.get("guidance", "Don't see surroundings, watch to the screen!")
        })

    total_faces = len(faces)
    engagement_rate = round((attentive_count / total_faces * 100.0), 1) if total_faces > 0 else 100.0

    # Determine primary head orientation & attentiveness
    if total_faces == 0:
        primary_head_orientation = "Face Not Visible"
        primary_attentive = False
        student_guidance = "Face not visible. Please position your face toward the camera."
    else:
        primary_head_orientation = engagement_metrics[0]["head_orientation"]
        primary_attentive = engagement_metrics[0]["is_attentive"]
        student_guidance = (
            "Good focus! Keep watching the screen."
            if primary_attentive
            else "Don't see surroundings, watch to the screen!"
        )

    # 2. Object detection via YOLO with robust false-positive filtering
    SMARTPHONE_MIN_CONF = 0.28

    if model is not None:
        try:
            results = model(frame_bgr, conf=SMARTPHONE_MIN_CONF, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                    bw, bh = x2 - x1, y2 - y1

                    is_phone = False
                    # Class 67: Cell phone in standard COCO
                    if cls_id == 67:
                        # Must have realistic handheld dimensions (area >= 800 px)
                        if bw >= 24 and bh >= 24 and (bw * bh >= 800):
                            # Suppress false positives on ears / sideburns
                            if is_ear_or_face_feature([x1, y1, bw, bh], face_boxes_coords):
                                continue

                            is_phone = True

                    # Class 62: TV/monitor/screen (only accept if handheld smartphone screen)
                    elif cls_id == 62 and conf >= 0.50:
                        if bw < img_w * 0.45 and bh < img_h * 0.45 and (bw * bh >= 1500):
                            if not is_ear_or_face_feature([x1, y1, bw, bh], face_boxes_coords):
                                is_phone = True

                    if is_phone:
                        phone_detections.append({
                            "box": [x1, y1, bw, bh],
                            "confidence": round(conf * 100, 1),
                            "label": "Smartphone",
                            "detection_time": detection_time_str
                        })
                        has_phone_alert = True
        except Exception as e:
            print(f"YOLO monitoring error: {e}")

    # Build standardized coordinate boxes for frontend canvas overlays
    phone_boxes = []
    for p in phone_detections:
        bx, by, bw, bh = p["box"]
        phone_boxes.append([bx, by, bx + bw, by + bh, p["confidence"] / 100.0])

    face_boxes = []
    for f in engagement_metrics:
        bx, by, bw, bh = f["box"]
        face_boxes.append([bx, by, bx + bw, by + bh, f["head_orientation"], f["is_attentive"]])

    # If phone detected OR student distracted (seeing surroundings / head turned / looking down), save snapshot
    is_distracted = (not primary_attentive) or (primary_head_orientation in [
        "Facing Left", "Facing Right", "Looking Down", "Looking Up", "Facing Away", "Head Tilted"
    ])

    if has_phone_alert or is_distracted:
        annotated = frame_bgr.copy()
        if has_phone_alert:
            for p in phone_detections:
                bx, by, bw, bh = p["box"]
                cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), (0, 0, 255), 3)
                cv2.putText(
                    annotated,
                    f"SMARTPHONE {p['confidence']}%",
                    (bx, max(25, by - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.65,
                    (0, 0, 255),
                    2
                )
        if is_distracted and len(faces) > 0:
            fb = faces[0]["box"]
            cv2.rectangle(annotated, (fb[0], fb[1]), (fb[0] + fb[2], fb[1] + fb[3]), (0, 165, 255), 2)
            cv2.putText(
                annotated,
                f"DISTRACTED ({primary_head_orientation})",
                (fb[0], max(25, fb[1] - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.60,
                (0, 165, 255),
                2
            )
            cv2.putText(
                annotated,
                "DON'T SEE SURROUNDINGS - WATCH SCREEN",
                (fb[0], min(img_h - 10, fb[1] + fb[3] + 25)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 165, 255),
                2
            )
        snapshot_filename = f"alert_{uuid.uuid4().hex[:10]}.jpg"
        save_path = os.path.join(SNAPSHOTS_DIR, snapshot_filename)
        cv2.imwrite(save_path, annotated)

    status_message = (
        "🚨 Smartphone Detected – Automatic Warning Signal Generated."
        if has_phone_alert
        else (
            "⚠️ Inattentive – Don't see surroundings, watch to the screen!"
            if is_distracted
            else "✅ Attentive – Watching Screen."
        )
    )

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "detection_time": detection_time_str,
        "classroom_name": classroom_name,
        "phone_detected": has_phone_alert,
        "phone_detections": phone_detections,
        "phone_boxes": phone_boxes,
        "detected_object": "Mobile Phone / Smartphone" if has_phone_alert else "None",
        "primary_confidence": phone_detections[0]["confidence"] if phone_detections else 0.0,
        "primary_head_orientation": primary_head_orientation,
        "is_attentive": primary_attentive,
        "student_guidance": student_guidance,
        "total_people_detected": total_faces,
        "attentive_count": attentive_count,
        "engagement_rate": engagement_rate,
        "faces": engagement_metrics,
        "face_boxes": face_boxes,
        "snapshot_url": f"/uploads/snapshots/{snapshot_filename}" if snapshot_filename else None,
        "alert_message": status_message
    }
