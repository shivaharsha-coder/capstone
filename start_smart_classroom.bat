@echo off
title Smart Classroom - Master Launch Script
echo ============================================================
echo   SMART CLASSROOM: AI-POWERED CLASSROOM MANAGEMENT SYSTEM
echo   Final-Year Academic Capstone Project
echo ============================================================
echo.
echo [1/2] Launching Backend Server (FastAPI + AI Models on port 8000)...
start "Smart Classroom - Backend API" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Launching Frontend Server (React + Tailwind on port 5173)...
start "Smart Classroom - Frontend Web App" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo ============================================================
echo   SERVERS ARE STARTING UP!
echo ============================================================
echo - Frontend Web Application: http://localhost:5173
echo - Backend Interactive API:   http://localhost:8000/docs
echo.
echo   PRE-CONFIGURED LOGIN CREDENTIALS:
echo   ----------------------------------------------------------
echo   [1] ADMINISTRATOR PORTAL:
echo       URL:   http://localhost:5173/login/admin
echo       Email: admin@smartclassroom.edu
echo       Pass:  Admin@1234
echo.
echo   [2] FACULTY PORTAL:
echo       URL:   http://localhost:5173/login/faculty
echo       Email: faculty@smartclassroom.edu
echo       Pass:  Faculty@1234
echo.
echo   [3] STUDENT PORTAL:
echo       URL:   http://localhost:5173/login/student
echo       Roll:  21CS101 (or alex@smartclassroom.edu)
echo       Pass:  Student@1234
echo ============================================================
echo.
echo Press any key to exit this launcher window (servers will remain running).
pause > nul

