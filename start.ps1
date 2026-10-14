# Cardio3D Clinical Decision Support System Launcher (PowerShell)
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Cardio3D Clinical Decision Support System Launcher   " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$repoRoot = $PSScriptRoot
Set-Location -Path $repoRoot

$pythonCmd = $null

# 1. Try py launcher
try {
    $res = & py -3 -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $res) {
        $pythonCmd = "py -3"
    }
} catch {}

# 2. Try python in PATH
if (-not $pythonCmd) {
    try {
        $res = & python -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $res) {
            $pythonCmd = "python"
        }
    } catch {}
}

# 3. Check AppData local python paths
if (-not $pythonCmd) {
    $found = Get-ChildItem -Path "$env:LOCALAPPDATA\Programs\Python\Python3*\python.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $pythonCmd = "& `"$($found.FullName)`""
    }
}

# 4. Check Program Files python paths
if (-not $pythonCmd) {
    $found = Get-ChildItem -Path "C:\Program Files\Python3*\python.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $pythonCmd = "& `"$($found.FullName)`""
    }
}

if (-not $pythonCmd) {
    Write-Host "[ERROR] Python was not found on your system!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Windows requires Python to run the Cardio3D ML server." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "HOW TO FIX:" -ForegroundColor Cyan
    Write-Host "1. Download Python 3.10 from: https://www.python.org/downloads/"
    Write-Host "   *** CRITICAL: Check the box 'Add python.exe to PATH' during installation! ***" -ForegroundColor Yellow
    Write-Host "2. OR run this in PowerShell:"
    Write-Host "   winget install Python.Python.3.10" -ForegroundColor Green
    Write-Host ""
    Read-Host -Prompt "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Using Python: $pythonCmd" -ForegroundColor Green
Write-Host ""

# Check dependencies
Write-Host "Checking required ML packages..." -ForegroundColor Gray
$checkCmd = "$pythonCmd -c `"import fastapi, uvicorn, sklearn, lightgbm, shap, pandas, numpy`""
Invoke-Expression $checkCmd 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] Installing required dependencies from requirements.txt..." -ForegroundColor Yellow
    Write-Host "(This only happens on the first run, please wait a minute)" -ForegroundColor Gray
    $installCmd = "$pythonCmd -m pip install -r requirements.txt"
    Invoke-Expression $installCmd
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Server is running at: http://localhost:8000           " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Open http://localhost:8000 in your browser!" -ForegroundColor Green
Write-Host "(Press CTRL+C to stop the server)" -ForegroundColor Gray
Write-Host ""

Set-Location -Path "$repoRoot\backend"
$runCmd = "$pythonCmd -m uvicorn main:app --host 127.0.0.1 --port 8000"
Invoke-Expression $runCmd
