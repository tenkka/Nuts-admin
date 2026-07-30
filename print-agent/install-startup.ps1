# 把打印/扫码代理注册为"开机（登录）自启动"，并立即启动一次。
# 需要用普通用户权限运行即可，不需要管理员。

$ErrorActionPreference = "Stop"
$agentDir = $PSScriptRoot
$taskName = "NutsPrintAgent"

$vbsPath = Join-Path $agentDir "run-hidden.vbs"
$vbsContent = @"
Set objShell = CreateObject("WScript.Shell")
objShell.CurrentDirectory = "$agentDir"
objShell.Run "cmd /c npm start", 0, False
"@
Set-Content -Path $vbsPath -Value $vbsContent -Encoding ASCII

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Nuts 后台管理 - 本地打印/扫码代理，开机自启动" | Out-Null

Write-Host "已注册开机自启动任务：$taskName"

Start-ScheduledTask -TaskName $taskName
Write-Host "已启动代理服务，几秒后可以在浏览器访问 http://127.0.0.1:9527/health 确认"
