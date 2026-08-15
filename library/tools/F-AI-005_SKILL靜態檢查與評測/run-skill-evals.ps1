$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path -LiteralPath ".\node_modules\.bin\promptfoo.cmd")) {
    Write-Host "Installing npm dependencies..."
    npm install
}

if (-not (Test-Path -LiteralPath ".\.venv-eval\Scripts\python.exe")) {
    Write-Host "Creating Python eval environment..."
    py -3.12 -m venv .venv-eval
}

Write-Host "Installing Python eval dependencies..."
.\.venv-eval\Scripts\python.exe -m pip install -r requirements-eval.txt

Write-Host "Running promptfoo skill smoke checks..."
npm run eval:promptfoo

Write-Host "Running DeepEval-backed static checks..."
.\.venv-eval\Scripts\python.exe -m pytest tests

Write-Host "Skill evaluation checks completed."
