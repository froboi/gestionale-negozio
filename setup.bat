@echo off
REM Gestionale Abbigliamento - Setup Script per Windows
REM Questo script automatizza il processo di setup completo

echo 🏪 Gestionale Abbigliamento - Setup Automatico per Windows
echo =======================================================

REM Controlla se Docker è installato
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker non è installato. Installare Docker Desktop prima di continuare.
    pause
    exit /b 1
)

REM Controlla se Docker Compose è installato
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose non è installato. Installare Docker Compose prima di continuare.
    pause
    exit /b 1
)

echo ✅ Docker e Docker Compose sono installati

REM Crea directory necessarie
echo 📁 Creazione directory necessarie...
if not exist "docker\nginx\logs" mkdir docker\nginx\logs
if not exist "docker\nginx\ssl" mkdir docker\nginx\ssl
if not exist "backend\logs" mkdir backend\logs
if not exist "backend\uploads" mkdir backend\uploads

REM Copia file di configurazione se non esistono
if not exist "backend\.env" (
    echo 📄 Creazione file backend\.env...
    copy backend\.env.example backend\.env
    echo ⚠️  Modifica il file backend\.env con i tuoi parametri
)

if not exist "docker\.env" (
    echo 📄 Creazione file docker\.env...
    copy docker\.env.example docker\.env
    echo ⚠️  Modifica il file docker\.env con i tuoi parametri
)

REM Genera certificati SSL per sviluppo (richiede OpenSSL)
if not exist "docker\nginx\ssl\cert.pem" (
    echo 🔐 Generazione certificati SSL per sviluppo...
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout docker\nginx\ssl\private.key -out docker\nginx\ssl\cert.pem -subj "/C=IT/ST=Italy/L=City/O=Gestionale/CN=localhost" 2>nul
    if %errorlevel% neq 0 (
        echo ⚠️  OpenSSL non trovato. Genera manualmente i certificati SSL o usa HTTP.
    ) else (
        echo ✅ Certificati SSL generati
    )
)

REM Avvia i container Docker
echo 🐳 Avvio dei container Docker...
cd docker
docker-compose up -d --build

REM Attende che il database sia pronto
echo ⏳ Attendo che il database sia pronto...
timeout /t 30 /nobreak >nul

REM Esegue le migrazioni del database
echo 🗄️  Esecuzione migrazioni database...
docker exec gestionale-backend npm run migrate

echo.
echo 🎉 Setup completato con successo!
echo.
echo 📋 Accesso all'applicazione:
echo    Frontend: https://localhost (HTTP: http://localhost)
echo    API: https://localhost/api
echo    Health Check: https://localhost/health
echo.
echo 👤 Credenziali admin di default:
echo    Username: admin
echo    Password: Admin123!
echo    ⚠️  CAMBIA IMMEDIATAMENTE LA PASSWORD!
echo.
echo 🔧 Comandi utili:
echo    Visualizza logs: docker-compose logs -f
echo    Ferma i servizi: docker-compose down
echo    Riavvia i servizi: docker-compose restart
echo.
echo 📖 Per la documentazione completa consulta il README.md

pause
