Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Starting Cardio3D Clinical Workstation Server...     " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "App URL: http://localhost:8000" -ForegroundColor Green
Write-Host ""
Set-Location -Path "$PSScriptRoot\backend"
& "C:\Users\aarus\AppData\Local\Programs\Python\Python310\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
