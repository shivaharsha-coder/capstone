import os
import base64
import math
from typing import List, Dict, Any, Optional, Tuple
import cv2
import numpy as np
try:
    import compat
except ImportError:
    pass
import torch
import torchvision.models as models

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YUNET_PATH = os.path.join(BASE_DIR, "models_weights", "face_detection_yunet_2023mar.onnx")

# Face recognition similarity threshold
RECOGNITION_THRESHOLD = 0.55  # 55% cosine similarity threshold for MobileNetV3

# Initialize PyTorch feature extractor once with pre-trained weights
_device = torch.device("cpu")
try:
    _weights = models.MobileNet_V3_Small_Weights.DEFAULT
    _feature_model = models.mobilenet_v3_small(weights=_weights)
except Exception as _e:
    print(f"Warning loading pretrained MobileNet weights: {_e}, fallback to weights=None")
    _feature_model = models.mobilenet_v3_small(weights=None)

_feature_model.classifier = torch.nn.Identity()
_feature_model.eval()

# Global YuNet detector cache keyed by (width, height)
_detectors = {}


def validate_camera_quality(img: np.ndarray) -> Dict[str, Any]:
    """
    Validates webcam frame image quality:
    - Blur check using Laplacian variance
    - Lighting / brightness check
    """
    if img is None or img.size == 0:
        return {"is_valid": False, "reason": "No image data"}
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        mean_brightness = np.mean(gray)

        is_blurry = blur_score < 25.0
        is_too_dark = mean_brightness < 30.0
        is_too_bright = mean_brightness > 245.0

        return {
            "is_valid": not (is_blurry or is_too_dark or is_too_bright),
            "blur_score": round(float(blur_score), 2),
            "mean_brightness": round(float(mean_brightness), 2),
            "is_blurry": is_blurry,
            "is_too_dark": is_too_dark,
            "is_too_bright": is_too_bright
        }
    except Exception:
        return {"is_valid": True, "blur_score": 100.0, "mean_brightness": 128.0}



def get_detector(width: int, height: int):
    key = (width, height)
    if key not in _detectors:
        if os.path.exists(YUNET_PATH):
            det = cv2.FaceDetectorYN_create(
                model=YUNET_PATH,
                config="",
                input_size=(width, height),
                score_threshold=0.55,
                nms_threshold=0.3,
                top_k=50
            )
            _detectors[key] = det
        else:
            return None
    return _detectors[key]


def decode_base64_image(base64_str: str) -> Optional[np.ndarray]:
    """Decodes a base64 encoded data-uri or raw string into an OpenCV BGR image."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None


def detect_faces_in_image(img: np.ndarray) -> List[Dict[str, Any]]:
    """
    Detects faces in image using YuNet.
    Returns a list of dicts with 'box': [x, y, w, h], 'score': float, 'landmarks': [10 floats]
    """
    h, w = img.shape[:2]
    detector = get_detector(w, h)
    results = []

    if detector is not None:
        try:
            _, faces = detector.detect(img)
            if faces is not None:
                for face in faces:
                    x, y, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])
                    score = float(face[-1])
                    landmarks = [float(v) for v in face[4:14]]

                    # Keep box within image boundaries
                    x = max(0, x)
                    y = max(0, y)
                    fw = min(w - x, fw)
                    fh = min(h - y, fh)

                    if fw > 20 and fh > 20:
                        results.append({
                            "box": [x, y, fw, fh],
                            "score": score,
                            "landmarks": landmarks
                        })
                return results
        except Exception as e:
            print(f"YuNet detection error: {e}")

    # Fallback if no detector or error: center crop if reasonable
    return results


def extract_face_embedding(img: np.ndarray, box: List[int]) -> Optional[List[float]]:
    """
    Crops the face, aligns/normalizes it, and extracts a normalized feature vector.
    """
    x, y, w, h = box
    ih, iw = img.shape[:2]
    x1, y1 = max(0, int(x)), max(0, int(y))
    x2, y2 = min(iw, int(x + w)), min(ih, int(y + h))
    face_crop = img[y1:y2, x1:x2]
    if face_crop.size == 0 or face_crop.shape[0] < 10 or face_crop.shape[1] < 10:
        return None

    try:
        # Resize to canonical 112x112
        face_resized = cv2.resize(face_crop, (112, 112))
        # Convert BGR to RGB
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)

        # Normalize to standard ImageNet mean/std
        tensor = torch.from_numpy(face_rgb).permute(2, 0, 1).float() / 255.0
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        tensor = (tensor - mean) / std
        tensor = tensor.unsqueeze(0)

        with torch.no_grad():
            feat = _feature_model(tensor).squeeze(0).numpy()

        # L2 normalize
        norm = np.linalg.norm(feat)
        if norm > 1e-12:
            feat = feat / norm
        return feat.tolist()
    except Exception as e:
        print(f"Error extracting embedding: {e}")
        return None


def register_face_from_samples(samples_base64: List[str]) -> Dict[str, Any]:
    """
    Processes multiple face sample frames from student webcam.
    Extracts embeddings and averages them to build a resilient face profile.
    """
    valid_embeddings = []
    sample_img_bytes = None

    for idx, s_b64 in enumerate(samples_base64):
        img = decode_base64_image(s_b64)
        if img is None:
            continue

        if sample_img_bytes is None and idx == 0:
            sample_img_bytes = s_b64

        faces = detect_faces_in_image(img)
        if faces:
            # Pick largest face
            largest_face = max(faces, key=lambda f: f["box"][2] * f["box"][3])
            emb = extract_face_embedding(img, largest_face["box"])
            if emb:
                valid_embeddings.append(np.array(emb, dtype=np.float32))

    if not valid_embeddings:
        return {
            "success": False,
            "message": "No clear face detected in the captured samples. Please ensure good lighting and face the camera directly.",
            "embedding": None,
            "sample_count": 0
        }

    # Average embeddings and re-normalize
    centroid = np.mean(valid_embeddings, axis=0)
    norm = np.linalg.norm(centroid)
    if norm > 1e-6:
        centroid = centroid / norm

    return {
        "success": True,
        "message": f"Successfully registered face using {len(valid_embeddings)} sample(s).",
        "embedding": centroid.tolist(),
        "sample_count": len(valid_embeddings),
        "sample_preview": sample_img_bytes
    }


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    if a.shape != b.shape:
        min_len = min(len(a), len(b))
        a = a[:min_len]
        b = b[:min_len]
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom < 1e-12:
        return 0.0
    return float(np.dot(a, b) / denom)


def calculate_head_pose_indicator(landmarks: List[float], box: List[int]) -> Dict[str, Any]:
    """
    Estimates head orientation and engagement status from 5 facial landmarks:
    landmarks: [re_x, re_y, le_x, le_y, nose_x, nose_y, rm_x, rm_y, lm_x, lm_y]
    Outputs one of the standard indicators:
    - Facing Forward (Attentive - looking at screen)
    - Facing Left (Inattentive - seeing surroundings)
    - Facing Right (Inattentive - seeing surroundings)
    - Looking Down (Inattentive - looking down at desk/surroundings)
    - Looking Up (Inattentive - looking up at ceiling/surroundings)
    - Facing Away (Inattentive - head turned away)
    - Head Tilted (Inattentive - head tilted sideways)
    """
    if len(landmarks) < 10:
        return {
            "orientation": "Facing Forward",
            "is_attentive": True,
            "yaw_ratio": 0.0,
            "tilt_angle": 0.0,
            "pitch_ratio": 1.0,
            "guidance": "Good focus! Keep watching the screen."
        }

    re_x, re_y = landmarks[0], landmarks[1]
    le_x, le_y = landmarks[2], landmarks[3]
    nose_x, nose_y = landmarks[4], landmarks[5]
    rm_x, rm_y = landmarks[6], landmarks[7]
    lm_x, lm_y = landmarks[8], landmarks[9]

    # Inter-ocular distance and angle
    eye_dx = le_x - re_x
    eye_dy = le_y - re_y
    eye_dist = math.sqrt(eye_dx**2 + eye_dy**2) + 1e-5

    # Horizontal asymmetry of nose relative to midpoint of eyes (Yaw)
    mid_eye_x = (re_x + le_x) / 2.0
    mid_eye_y = (re_y + le_y) / 2.0
    mid_mouth_y = (rm_y + lm_y) / 2.0

    norm_yaw = (nose_x - mid_eye_x) / max(1.0, abs(eye_dx))

    # Tilt angle in degrees (Roll)
    tilt_angle = math.degrees(math.atan2(eye_dy, eye_dx))

    # Vertical pitch ratio and nose vertical position in face box
    eye_to_nose_y = max(1.0, nose_y - mid_eye_y)
    nose_to_mouth_y = max(1.0, mid_mouth_y - nose_y)
    pitch_ratio = eye_to_nose_y / nose_to_mouth_y

    bx, by, bw, bh = box
    nose_box_y = (nose_y - by) / max(1.0, bh)

    # 1. Extreme orientation away from screen
    if abs(norm_yaw) >= 0.35 or abs(tilt_angle) >= 28.0:
        orientation = "Facing Away"
        is_attentive = False
        guidance = "Don't see surroundings, watch to the screen!"
    # 2. Looking down at desk, lap, or surroundings (e.g. bowed head)
    elif pitch_ratio >= 1.30 or nose_box_y >= 0.57:
        orientation = "Looking Down"
        is_attentive = False
        guidance = "Don't see surroundings, watch to the screen!"
    # 3. Looking up away from screen
    elif pitch_ratio <= 0.60:
        orientation = "Looking Up"
        is_attentive = False
        guidance = "Don't see surroundings, watch to the screen!"
    # 4. Facing Left (seeing surroundings)
    elif norm_yaw >= 0.12:
        orientation = "Facing Left"
        is_attentive = False
        guidance = "Don't see surroundings, watch to the screen!"
    # 5. Facing Right (seeing surroundings)
    elif norm_yaw <= -0.12:
        orientation = "Facing Right"
        is_attentive = False
        guidance = "Don't see surroundings, watch to the screen!"
    # 6. Head tilted heavily sideways
    elif abs(tilt_angle) >= 18.0:
        orientation = "Head Tilted"
        is_attentive = False
        guidance = "Don't see surroundings, watch to the screen!"
    # 7. Directly Facing Forward & Attentive
    else:
        orientation = "Facing Forward"
        is_attentive = True
        guidance = "Good focus! Keep watching the screen."

    return {
        "orientation": orientation,
        "is_attentive": is_attentive,
        "yaw_ratio": round(abs(norm_yaw), 2),
        "tilt_angle": round(tilt_angle, 1),
        "pitch_ratio": round(pitch_ratio, 2),
        "guidance": guidance
    }



def recognize_faces_in_frame(
    frame_bgr: np.ndarray,
    registered_students: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Processes a live camera frame, detects all faces, extracts embeddings,
    and matches against registered students using cosine similarity.
    """
    detected_faces = detect_faces_in_image(frame_bgr)
    results = []

    for face in detected_faces:
        box = face["box"]
        landmarks = face["landmarks"]
        emb = extract_face_embedding(frame_bgr, box)

        head_pose = calculate_head_pose_indicator(landmarks, box)

        if not emb:
            continue

        best_student = None
        highest_sim = -1.0

        for stud in registered_students:
            stud_emb = stud.get("embedding")
            if not stud_emb:
                continue
            sim = cosine_similarity(emb, stud_emb)
            if sim > highest_sim:
                highest_sim = sim
                best_student = stud

        # Determine confidence percentage
        confidence_pct = max(0.0, min(100.0, round(highest_sim * 100, 1)))

        if highest_sim >= RECOGNITION_THRESHOLD and best_student:
            results.append({
                "student_id": best_student["id"],
                "roll_number": best_student["roll_number"],
                "full_name": best_student["full_name"],
                "confidence": confidence_pct,
                "is_recognized": True,
                "box": box,
                "landmarks": landmarks,
                "head_pose": head_pose
            })
        else:
            results.append({
                "student_id": None,
                "roll_number": "Unknown",
                "full_name": "Unrecognized Student",
                "confidence": confidence_pct,
                "is_recognized": False,
                "box": box,
                "landmarks": landmarks,
                "head_pose": head_pose
            })

    return results

