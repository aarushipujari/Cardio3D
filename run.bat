@echo off
setlocal enabledelayedexpansion
title Cardio3D Clinical Workstation
echo =======================================================
echo   Cardio3D Clinical Decision Support System Launcher
echo =======================================================
echo.

cd /d "%~dp0"

set PYTHON_CMD=

:: 1. Check if 'py' launcher is available
py -3 -c "import sys" >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON_CMD=py -3
    goto :found_python
)

:: 2. Check if 'python' command is available and actually runs (not MS Store alias)
python -c "import sys" >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :found_python
)

:: 3. Check common local app data python paths
for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*") do (
    if exist "%%D\python.exe" (
        set PYTHON_CMD="%%D\python.exe"
        goto :found_python
    )
)

:: 4. Check common program files python paths
for /d %%D in ("C:\Program Files\Python3*") do (
    if exist "%%D\python.exe" (
        set PYTHON_CMD="%%D\python.exe"
        goto :found_python
    )
)

:: If not found, print clear error and instructions
echo [ERROR] Python was not found on your system!
echo.
echo Windows requires Python to run the Cardio3D ML server.
echo.
echo HOW TO FIX:
echo 1. Download Python 3.10 or 3.11 from: https://www.python.org/downloads/
echo    *** CRITICAL: During installation, CHECK THE BOX: 'Add python.exe to PATH' ***
echo.
echo 2. OR run this in PowerShell (Run as Administrator):
echo    winget install Python.Python.3.10
echo.
echo 3. After installing, close and reopen this window, then double-click run.bat again.
echo.
pause
exit /b 1

:found_python
echo [OK] Using Python: %PYTHON_CMD%
echo.

:: Check if backend dependencies are installed
echo Checking required ML packages (fastapi, uvicorn, scikit-learn, lightgbm, shap)...
%PYTHON_CMD% -c "import fastapi, uvicorn, sklearn, lightgbm, shap, pandas, numpy" >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Installing required dependencies from requirements.txt...
    echo (This only happens on the first run, please wait a minute)
    echo.
    %PYTHON_CMD% -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies. Please run manually:
        echo   %PYTHON_CMD% -m pip install -r requirements.txt
        echo.
        pause
        exit /b 1
    )
)

echo.
echo =======================================================
echo   Server is running at: http://localhost:8000
echo =======================================================
echo   Open http://localhost:8000 in your browser!
echo   (Press CTRL+C to stop the server)
echo =======================================================
echo.

cd /d "%~dp0backend"
%PYTHON_CMD% -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
