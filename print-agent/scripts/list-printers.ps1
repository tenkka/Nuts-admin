$ErrorActionPreference = "Stop"
$names = @(Get-Printer | Select-Object -ExpandProperty Name)
$names | ConvertTo-Json
