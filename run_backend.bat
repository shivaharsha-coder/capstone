@echo off
title Smart Classroom - Backend Server (FastAPI)
echo ============================================================
echo   SMART CLASSROOM: AI-POWERED CLASSROOM MANAGEMENT SYSTEM
echo   Starting Python FastAPI Backend Server on port 8000...
echo ============================================================
cd /d "%~dp0backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause

