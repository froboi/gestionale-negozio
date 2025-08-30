@echo off
echo 🚀 Avvio del Sistema Gestionale Negozio
echo.

echo ✅ 1. Avvio Backend Docker...
cd docker
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Errore nell'avvio del backend
    pause
    exit /b 1
)

echo ✅ 2. Attendere avvio backend...
timeout /t 10 /nobreak > nul

echo ✅ 3. Avvio Frontend Development Server...
cd ..\frontend
set BROWSER=none
start cmd /c "npm start"

echo.
echo 🎉 Sistema avviato!
echo.
echo 📋 URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo 🔐 Credenziali di accesso:
echo   Username: admin
echo   Password: admin123
echo.
echo ⏹️ Per fermare il sistema, premi CTRL+C in questo terminale
echo    e poi esegui: docker-compose down
echo.
pause
