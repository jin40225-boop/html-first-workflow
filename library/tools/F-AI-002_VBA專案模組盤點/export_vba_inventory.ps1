param(
  [string]$WorkbookPath = 'C:\範例\Excel VBA 管理系統\範例個案彙整表.xlsm',
  [string]$OutputDir = ''
)

. (Join-Path $PSScriptRoot '_bootstrap_utf8.ps1')

if([string]::IsNullOrWhiteSpace($OutputDir)){
  $OutputDir = Join-Path $PSScriptRoot 'vba_inventory_export'
}

$wbPath = Resolve-ExistingPath -LiteralPath $WorkbookPath
if(!(Test-Path -LiteralPath $OutputDir)){ New-Item -ItemType Directory -Path $OutputDir | Out-Null }
Get-ChildItem -LiteralPath $OutputDir -File -ErrorAction SilentlyContinue | Remove-Item -Force

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $null
try {
  $wb = $excel.Workbooks.Open($wbPath, $null, $true)
  $rows = @()

  foreach($comp in $wb.VBProject.VBComponents){
    $name = $comp.Name
    $type = [int]$comp.Type
    $lines = 0
    try { $lines = [int]$comp.CodeModule.CountOfLines } catch {}

    $outFile = ''
    if($type -eq 1 -and $lines -gt 0){
      $text = $comp.CodeModule.Lines(1, $lines)
      $outFile = Join-Path $OutputDir ($name + '.bas')
      [System.IO.File]::WriteAllText($outFile, $text, [System.Text.UTF8Encoding]::new($true))
    }

    $rows += [pscustomobject]@{
      Name = $name
      Type = $type
      CodeLines = $lines
      Path = $outFile
    }
  }

  $csv = Join-Path $OutputDir '_components.csv'
  $rows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $csv
  Write-Output ('DONE: ' + ($rows | Measure-Object | Select-Object -ExpandProperty Count))
  Write-Output ('OUTPUT_DIR: ' + $OutputDir)
}
finally {
  if($wb -ne $null){ $wb.Close($false) | Out-Null }
  $excel.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
