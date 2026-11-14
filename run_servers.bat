@echo off
title Smart Classroom Launcher
echo ========================================================
echo   Starting Smart Classroom AI Platform
echo ========================================================
echo.
echo [1/2] Starting Backend (FastAPI on Port 8000)...
start "Smart Classroom - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Frontend (Vite on Port 5173)...
start "Smart Classroom - Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo ========================================================
echo   Smart Classroom System Running Successfully!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ========================================================
ping 127.0.0.1 -n 2 >nul
