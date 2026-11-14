@echo off
title Smart Classroom - Frontend Server (React + Vite)
echo ============================================================
echo   SMART CLASSROOM: AI-POWERED CLASSROOM MANAGEMENT SYSTEM
echo   Starting React Vite Frontend Dev Server on port 5173...
echo ============================================================
cd /d "%~dp0frontend"
cmd /c npm run dev
pause

