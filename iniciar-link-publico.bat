@echo off
title Sanbus FET - Modo Link Publico (Cloudflare Tunnel)
color 0A

echo ========================================================
echo   1. Compilando la ultima version del Frontend (React)...
echo ========================================================
call npm run build

echo.
echo ========================================================
echo   2. Reiniciando el Backend + Base de Datos en puerto 5000...
echo ========================================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
start "Sanbus Backend (Puerto 5000)" cmd /k "node backend/server.js"

timeout /t 2 /nobreak >nul

echo.
echo ========================================================
echo   3. Generando tu Link Publico HTTPS con Cloudflare...
echo   (Copia el link que termina en .trycloudflare.com)
echo ========================================================
echo.
call npx --yes cloudflared tunnel --url http://localhost:5000
pause
