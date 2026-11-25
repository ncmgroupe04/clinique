@echo off
title Agent impression - Clinique
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0print-agent.ps1"
echo.
echo L'agent est arrete.
pause
