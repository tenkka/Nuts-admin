# 取消开机自启动，并尝试停止当前正在运行的代理进程。

$ErrorActionPreference = "SilentlyContinue"
$taskName = "NutsPrintAgent"

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Host "已取消开机自启动任务：$taskName"

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match "print-agent" } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force
        Write-Host "已停止正在运行的代理进程 (PID $($_.ProcessId))"
    }
