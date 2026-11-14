import sys
import os

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import compat

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
import models
from routers import (
    auth,
    students,
    attendance,
    assignments,
    assessments,
    materials,
    tasks,
    monitoring,
    announcements,
    notifications,
    reports,
    admin,
)
from seed import seed_database

from contextlib import asynccontextmanager

# Create DB tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically seed the database on initial start
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seeding notice: {e}")
    yield


app = FastAPI(
    title="SMART CLASSROOM API",
    description="AI-Powered Classroom Management System with Facial Recognition Attendance & YOLO Monitoring",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(assignments.router)
app.include_router(assessments.router)
app.include_router(materials.router)
app.include_router(tasks.router)
app.include_router(monitoring.router)
app.include_router(announcements.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(admin.router)





@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "SMART CLASSROOM API",
        "version": "1.0.0",
        "face_model": "OpenCV YuNet + SFace/DeepEmbedder",
        "yolo_model": "Ultralytics YOLOv8n"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
