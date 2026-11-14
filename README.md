# SMART CLASSROOM: AI-Powered Classroom Management System

An academic final-year capstone project delivering a modern, responsive, dark-mode web application for university classroom administration. Built with **React.js, Tailwind CSS, Python FastAPI, PostgreSQL / SQLite (SQLAlchemy), OpenCV Facial Biometrics, and YOLOv8 Object Detection**.

---

## 🌟 Key Features

### 1. Dual Independent Authentication System
- **Faculty Portal**: `faculty@smartclassroom.edu` / `Faculty@1234`
- **Student Portal**: University Roll Number (e.g. `21CS101`) or Email (`student@smartclassroom.edu`) / `Student@1234`
- Role-based JWT security, bcrypt password hashing, session management, password strength meter (Weak/Medium/Strong with length, uppercase, lowercase, numbers, and special characters), and password reset flow.

### 2. AI Facial Recognition Attendance (Main Feature)
- Native camera access via browser `navigator.mediaDevices.getUserMedia()`.
- Multi-camera selection support (front/back on tablets/phones, external webcams on desktops).
- Real-time face detection using **OpenCV YuNet** (`face_detection_yunet_2023mar.onnx`).
- 576-dimensional deep feature embeddings extracted via PyTorch neural backbone.
- Real-time Cosine Similarity matching against registered student biometric profiles.
- Automatic attendance marking with confidence scoring (prevents duplicate scans within the same session).
- Live Roster verification with manual override (Present, Late, Absent) and CSV export.

### 3. Student Management & Webcam Face Enrollment
- Faculty/admin registers students with Full Name, University Roll Number (unique), Email (unique), Department, Academic Year, and Section.
- **Integrated Webcam Face Registration Tool**: Captures multiple face snapshots directly from the camera to build a robust biometric profile.
- Students can also register or update their own facial embeddings from their student profile.

### 4. LMS Coursework & Targeted Assignments
- Inspired by Canvas LMS: Title, description, due date, maximum marks, and document attachments.
- **Three Granular Recipient Types**:
  1. *All Students*
  2. *Selected Students* (multi-student selector)
  3. *Selected Groups* (by Department, Academic Year, and Section)
- Strict backend permission enforcement: Students only see assignments assigned to them.
- File upload submissions, faculty grading with marks and custom feedback.

### 5. Assessments & MCQ Quiz Engine
- Faculty creates timed quizzes with dynamic question bank (Question text, Options A/B/C/D, Correct Option, Marks).
- Student quiz attempt interface with real-time countdown timer, question navigator, and instant auto-grading.
- Review mode showing correct answers and score percentage.

### 6. AI Classroom Monitoring & YOLO Smartphone Detection
- Live camera stream analyzed using **Ultralytics YOLOv8** (`yolov8n.pt`, COCO Class 67: Cell Phone).
- Immediate alerts generated upon unauthorized phone visibility with bounding boxes, confidence %, and image snapshots.
- Classroom head orientation engagement indicator (Facing Forward, Turned Away, Tilted, Engagement %).
- Academic ethics & transparency banner with faculty alert review and acknowledgment workflow.

### 7. Today's Tasks & Notification Center
- Task delegation by faculty to individual students or class-wide.
- Real-time and persistent notification notifications for attendance, submissions, tests, and alerts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Tailwind CSS v4, React Router v7, Recharts, Lucide Icons, Axios |
| **Backend** | Python 3.14 / 3.11+, FastAPI, Uvicorn, Pydantic, PyJWT, bcrypt |
| **Database** | PostgreSQL / SQLite (SQLAlchemy 2.0 ORM with 18 relational models) |
| **Computer Vision & AI** | OpenCV 5.0 (YuNet Face Detector), PyTorch, TorchVision, Ultralytics YOLOv8 |

---

## 🚀 Quick Startup Guide

### Prerequisites
- Python 3.10+ (with `pip`)
- Node.js 18+ and `npm`

### Step 1: Automated Launch (Windows 1-Click)
Double-click:
```bash
start_smart_classroom.bat
```
This automatically launches both the FastAPI backend server on `http://localhost:8000` and the React frontend on `http://localhost:5173`.

---

### Step 2: Manual Terminal Startup

#### Terminal 1 — Backend API Server
```powershell
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend runs at `http://localhost:8000` (Interactive Swagger Docs at `http://localhost:8000/docs`).*

#### Terminal 2 — Frontend Application
```powershell
cd frontend
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

## 🔑 Pre-Configured Test Demonstration Accounts

| Role | Name | Email / Roll Number | Password |
|---|---|---|---|
| **Faculty (HOD)** | Dr. Rajesh Sharma | `faculty@smartclassroom.edu` | `Faculty@1234` |
| **Student 1 (Main Demo)** | Alex Turner | Roll: `21CS101` (or `student@smartclassroom.edu`) | `Student@1234` |
| **Student 2** | Alice Smith | Roll: `21CS001` (or `student1@smartclassroom.edu`) | `Student@1234` |
| **Student 3** | Bob Johnson | Roll: `21CS002` (or `student2@smartclassroom.edu`) | `Student@1234` |
| **Student 4** | Carol Williams | Roll: `21CS003` (or `student3@smartclassroom.edu`) | `Student@1234` |

*Tip: Both login pages feature an **Auto Fill** button for instant demonstration.*

---

## 🧪 Comprehensive Automated Test Suite

Run the full end-to-end verification test suite:
```powershell
python backend/test_all_features.py
```
This script exercises:
- Password strength validation logic
- Faculty & Student JWT authentication
- Roll number and email uniqueness constraints
- Face feature extraction & Cosine similarity math
- Live attendance scanning & duplicate scan prevention
- Manual attendance override
- Targeted assignment visibility isolation
- Student assignment submissions & faculty grading
- MCQ quiz attempt & automated score calculation
- YOLO cell phone detection & head orientation metrics
- Dashboard analytics aggregation

---

## 🗄️ Database Architecture & PostgreSQL Setup

The project uses SQLAlchemy ORM which operates seamlessly with either **PostgreSQL** or **SQLite**:

### Using SQLite (Default, Zero-Configuration)
No setup required. The database file `smart_classroom.db` resides automatically inside the `backend/` directory with all 18 tables pre-seeded.

### Using PostgreSQL (Optional Production Database)
1. Create a database in PostgreSQL:
   ```sql
   CREATE DATABASE smart_classroom;
   ```
2. Set the environment variable:
   ```bash
   set DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/smart_classroom
   ```
3. Run the seed script:
   ```bash
   python backend/seed.py
   ```

---

## 📷 Camera Permissions & Hardware Troubleshooting
1. Open Google Chrome, Edge, or Firefox.
2. Navigate to `http://localhost:5173`.
3. When prompted, click **Allow** on the browser camera permission dialog.
4. On laptops with multiple cameras, use the camera device dropdown to switch between Front, Back, or External USB webcams.
5. All live video streams are processed directly in-memory; no video recordings are saved to disk.

