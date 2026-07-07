@echo off
REM ============================================================
REM  小红书自动发布 - 中午时段（配合 Windows 计划任务）
REM  每天 12:30 自动发布 1 篇
REM ============================================================
REM
REM  安装计划任务（管理员 CMD 运行）：
REM    schtasks /Create /SC DAILY /TN "XHS-Noon" /TR "%~dp0xhs-publish-noon.bat" /ST 12:30
REM
REM  卸载：
REM    schtasks /Delete /TN "XHS-Noon" /F
REM ============================================================

cd /d "C:\Users\AppleLo\ZCodeProject\sinteredstoneworld\marketing"

REM 调用 Node 发布脚本：--count 1 发1篇，--slot noon 记录时段，--no-dry 真发
node --no-deprecation scripts\publish-xhs.js --count 1 --slot noon --no-dry

REM 退出码写日志（可选）
echo [%date% %time%] noon 任务退出码 %errorlevel% >> xiaohongshu\xhs-publish.log
