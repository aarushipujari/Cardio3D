@echo off
title Cardio3D Clinical Workstation
echo =======================================================
echo   Starting Cardio3D Clinical Workstation Server...
echo =======================================================
echo.
echo URL: http://localhost:8000
echo.
cd /d "%~dp0backend"
"C:\Users\aarus\AppData\Local\Programs\Python\Python310\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
