# UniDeploy Windows Installer (PowerShell)
# Usage: irm https://unideploy.in/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Owner = "rahulpandey535"
$Repo = "unideploy"
$InstallDir = "$env:LOCALAPPDATA\Programs\UniDeploy"
$BinPath = "$InstallDir\unideploy.exe"

Write-Host "┌─────────────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│  UniDeploy Windows Installer                    │" -ForegroundColor Cyan
Write-Host "└─────────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# Ensure install directory exists
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$Arch = $env:PROCESSOR_ARCHITECTURE
Write-Host "Detecting environment..." -ForegroundColor Gray
Write-Host "  OS:           Windows"
Write-Host "  Architecture: $Arch"
Write-Host ""

$DownloadUrl = "https://github.com/$Owner/$Repo/releases/latest/download/unideploy-windows-x64.exe"

Write-Host "Downloading latest UniDeploy binary..." -ForegroundColor Yellow
$DownloadSuccess = $false

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $BinPath -UseBasicParsing
    $DownloadSuccess = $true
} catch {
    Write-Host "Direct binary download unavailable, falling back to npm package..." -ForegroundColor Gray
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install -g @unideploy/cli
        Write-Host ""
        Write-Host "UniDeploy CLI installed via npm!" -ForegroundColor Green
        exit 0
    }
}

if (-not $DownloadSuccess -and -not (Test-Path $BinPath)) {
    Write-Host "❌ Failed to download binary. Please install Node.js and run: npm install -g @unideploy/cli" -ForegroundColor Red
    exit 1
}

# Add to user PATH if not already present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    Write-Host "Adding $InstallDir to user PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    $env:Path += ";$InstallDir"
}

Write-Host ""
Write-Host "✓ UniDeploy installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Verify installation by opening a new terminal and running:" -ForegroundColor White
Write-Host "  unideploy --version" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connect to your account & Cloudflare server:" -ForegroundColor White
Write-Host "  unideploy auth" -ForegroundColor Cyan
Write-Host ""
