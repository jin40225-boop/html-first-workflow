param(
  [string]$WorkbookPath = 'C:\範例\Excel VBA 管理系統\範例個案彙整表.xlsm',
  [string]$ProjectRoot = 'C:\範例\Excel VBA 管理系統'
)

. (Join-Path $PSScriptRoot '_bootstrap_utf8.ps1')

function Invoke-Step {
  param([scriptblock]$Action, [string]$Name)
  & $Action
  $hasExit = Get-Variable -Name LASTEXITCODE -ErrorAction SilentlyContinue
  if($hasExit -and $LASTEXITCODE -ne 0){
    throw "Step failed: $Name (exit=$LASTEXITCODE)"
  }
}

Invoke-Step -Name 'export_vba_inventory' -Action {
  & (Join-Path $PSScriptRoot 'export_vba_inventory.ps1') -WorkbookPath $WorkbookPath -OutputDir (Join-Path $PSScriptRoot 'vba_inventory_export')
}

Invoke-Step -Name 'build_module_inventory' -Action {
  & (Join-Path $PSScriptRoot 'run_python_utf8.ps1') -ScriptPath (Join-Path $PSScriptRoot 'build_module_inventory.py') -ScriptArgs @('--inventory-root', (Join-Path $PSScriptRoot 'vba_inventory_export'))
}

Invoke-Step -Name 'build_vba_report_utf8' -Action {
  & (Join-Path $PSScriptRoot 'run_python_utf8.ps1') -ScriptPath (Join-Path $PSScriptRoot 'build_vba_report_utf8.py') -ScriptArgs @('--inventory-root', (Join-Path $PSScriptRoot 'vba_inventory_export'), '--project-root', $ProjectRoot)
}

Invoke-Step -Name 'build_vba_text_table' -Action {
  & (Join-Path $PSScriptRoot 'run_python_utf8.ps1') -ScriptPath (Join-Path $PSScriptRoot 'build_vba_text_table.py') -ScriptArgs @('--inventory-root', (Join-Path $PSScriptRoot 'vba_inventory_export'), '--project-root', $ProjectRoot)
}

Write-Output 'DONE: VBA analysis pipeline finished.'
