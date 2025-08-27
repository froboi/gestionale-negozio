#!/bin/bash

# Gestionale Abbigliamento - Setup Script
# This script automates the complete setup process

set -e

echo "🏪 Gestionale Abbigliamento - Setup Automatico"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker non è installato. Installare Docker prima di continuare.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose non è installato. Installare Docker Compose prima di continuare.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker e Docker Compose sono installati${NC}"

# Create necessary directories
echo "📁 Creazione directory necessarie..."
mkdir -p docker/nginx/logs
mkdir -p docker/nginx/ssl
mkdir -p backend/logs
mkdir -p backend/uploads

# Copy environment files if they don't exist
if [ ! -f "backend/.env" ]; then
    echo "📄 Creazione file backend/.env..."
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  Modifica il file backend/.env con i tuoi parametri${NC}"
fi

if [ ! -f "docker/.env" ]; then
    echo "📄 Creazione file docker/.env..."
    cp docker/.env.example docker/.env
    echo -e "${YELLOW}⚠️  Modifica il file docker/.env con i tuoi parametri${NC}"
fi

# Generate SSL certificates for development
if [ ! -f "docker/nginx/ssl/cert.pem" ]; then
    echo "🔐 Generazione certificati SSL per sviluppo..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/nginx/ssl/private.key \
        -out docker/nginx/ssl/cert.pem \
        -subj "/C=IT/ST=Italy/L=City/O=Gestionale/CN=localhost"
    echo -e "${GREEN}✅ Certificati SSL generati${NC}"
fi

# Build and start containers
echo "🐳 Avvio dei container Docker..."
cd docker
docker-compose up -d --build

# Wait for database to be ready
echo "⏳ Attendo che il database sia pronto..."
sleep 30

# Run database migrations
echo "🗄️  Esecuzione migrazioni database..."
docker exec gestionale-backend npm run migrate

echo ""
echo -e "${GREEN}🎉 Setup completato con successo!${NC}"
echo ""
echo "📋 Accesso all'applicazione:"
echo "   Frontend: https://localhost (HTTP: http://localhost)"
echo "   API: https://localhost/api"
echo "   Health Check: https://localhost/health"
echo ""
echo "👤 Credenziali admin di default:"
echo "   Username: admin"
echo "   Password: Admin123!"
echo "   ${RED}⚠️  CAMBIA IMMEDIATAMENTE LA PASSWORD!${NC}"
echo ""
echo "🔧 Comandi utili:"
echo "   Visualizza logs: docker-compose logs -f"
echo "   Ferma i servizi: docker-compose down"
echo "   Riavvia i servizi: docker-compose restart"
echo ""
echo "📖 Per la documentazione completa consulta il README.md"
