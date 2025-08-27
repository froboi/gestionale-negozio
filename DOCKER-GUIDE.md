# 🐳 Guida Rapida Docker per il Gestionale

## Comandi Base

### Avviare tutto
cd docker
docker-compose up -d

### Vedere i container attivi
docker ps

### Vedere i log di un container
docker logs gestionale-backend
docker logs gestionale-db

### Fermare tutto
docker-compose down

### Riavviare un singolo servizio
docker-compose restart gestionale-backend

### Entrare dentro un container (debug)
docker exec -it gestionale-backend bash
docker exec -it gestionale-db mysql -u root -p

### Vedere l'uso delle risorse
docker stats

### Pulire tutto (ATTENZIONE: cancella i dati!)
docker-compose down -v
docker system prune -a

## Stati dei Container

### Container sano ✅
STATUS: Up (healthy)

### Container con problemi ❌
STATUS: Exited, Restarting, unhealthy

### Primo avvio normale ⏳
STATUS: Up (health: starting)

## Risoluzione Problemi

### Database non si avvia
- Controllare password in .env
- Verificare spazio disco
- docker logs gestionale-db

### Backend non si connette al DB
- Attendere che DB sia "healthy"
- Verificare variabili in .env
- docker logs gestionale-backend

### Frontend non carica
- Verificare che backend sia attivo
- Controllare nginx logs
- docker logs gestionale-nginx

### Porta già in uso
- Cambiare porta in docker-compose.yml
- O fermare il servizio che usa la porta

## Monitoraggio

### Verifica salute sistema
curl http://localhost/health

### Verifica database
docker exec gestionale-db mysqladmin ping

### Verifica spazio
docker system df
