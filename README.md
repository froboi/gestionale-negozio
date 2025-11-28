# 🏪 Gestionale Abbigliamento Sicuro

Una **web application gestionale completa e sicura** per negozi di abbigliamento, sviluppata con tecnologie moderne e focus sulla sicurezza.

## ✨ Caratteristiche Principali

### 🔐 **Sicurezza di Alto Livello**
- **Autenticazione a due fattori (2FA)** obbligatoria per profili tecnici
- Password crittografate con **bcrypt** e salt personalizzati
- Protezioni **CSRF, XSS, SQL Injection**
- **Rate limiting** e protezione da brute force
- **Audit logging** completo delle azioni critiche
- Comunicazioni **HTTPS/TLS** obbligatorie
- Sessioni sicure con scadenza automatica

### 📦 **Gestione Magazzino Avanzata**
- Catalogazione prodotti con codice, taglia, colore, prezzo
- **Sistema multi-taglia avanzato** con creazione automatica di varianti prodotto
- **Taglie standardizzate** (XS/40, S/42, M/44, L/46, XL/48, XXL/50, No)
- **Generazione automatica barcode** univoci per ogni variante
- **Creazione PDF stampabili** con barcode e taglia
- Controllo scorte minime con avvisi automatici
- Ricerca avanzata e filtri multipli
- **Modalità creazione rapida** per collezioni complete

### 👥 **Gestione Clienti e Fidelity**
- Anagrafica completa clienti
- **Storico acquisti** = sistema fidelity digitale
- Gestione punti fedeltà
- **Messaggi automatici di compleanno** via WhatsApp Business API
- Sconti personalizzati basati su età e storico

### 📊 **Pannello Amministrativo**
- **Dashboard** con statistiche real-time
- Report vendite e inventario esportabili in PDF
- Gestione utenti e ruoli
- **Monitoraggio sistema** e health checks
- Log di audit consultabili

### 🎂 **Automazione WhatsApp**
- Controllo **giornaliero automatico** dei compleanni
- Invio messaggi personalizzati con sconti esclusivi
- Integrazione **WhatsApp Business API ufficiale**
- Template messaggi configurabili

## 🏗️ **Architettura Tecnica**

### **Backend (Node.js + Express)**
- API RESTful sicure con autenticazione JWT
- Database MySQL con query parametrizzate
- Middleware di sicurezza multipli
- Sistema di logging centralizzato
- Validazione input rigorosa

### **Frontend (React + TypeScript)**
- Interfaccia moderna e responsive
- Material-UI per design consistente
- Gestione stato con React Query
- Routing protetto per ruoli
- Notifiche toast user-friendly

### **Database (MySQL)**
- Schema ottimizzato per performance
- Indici strategici per ricerche veloci
- Constraint di integrità referenziale
- Backup automatici programmati

### **Deployment (Docker + Nginx)**
- **Containerizzazione completa** con Docker
- **Nginx reverse proxy** con SSL/TLS
- Load balancing e caching
- Isolamento dei servizi
- Scalabilità orizzontale

## 🚀 **Installazione e Setup**

### **Prerequisiti**
- Node.js 18+
- MySQL 8.0+
- Docker & Docker Compose
- Account WhatsApp Business API

### **1. Clonazione Repository**
```bash
git clone https://github.com/your-username/gestionale-negozio.git
cd gestionale-negozio/gestionale
```

### **2. Configurazione Environment**
```bash
# Backend
cp backend/.env.example backend/.env
# Modifica le variabili in backend/.env

# Docker
cp docker/.env.example docker/.env
# Modifica le variabili in docker/.env
```

### **3. Avvio con Docker (Consigliato)**
```bash
cd docker
docker-compose up -d
```

### **4. Setup Database**
```bash
# Eseguire migrazioni
docker exec gestionale-backend npm run migrate
```

### **5. Accesso Applicazione**
- Frontend: `http://localhost` (o dominio configurato)
- API Backend: `http://localhost/api`
- Admin Panel: `http://localhost/admin`

## 🔧 **Configurazione WhatsApp Business API**

1. Registra un account WhatsApp Business
2. Ottieni le credenziali API da Meta for Developers
3. Configura le variabili nel file `.env`:
   ```env
   WHATSAPP_ACCESS_TOKEN=your_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id
   WHATSAPP_VERIFY_TOKEN=your_verify_token
   ```

## 👨‍💼 **Gestione Utenti e Ruoli**

### **Ruoli Disponibili:**
- **Admin**: Accesso completo al sistema
- **Manager**: Gestione prodotti, clienti, vendite
- **Employee**: Vendite e consultazione dati

### **Primo Accesso:**
1. Creare utente admin tramite console database
2. Login con credenziali admin
3. Configurare 2FA per profili tecnici
4. Creare altri utenti tramite pannello admin

## 📋 **Funzionalità Dettagliate**

### **🛍️ Gestione Vendite**
- Creazione vendita con ricerca prodotti
- Calcolo automatico sconti e totali
- Gestione pagamenti multipli
- Stampa scontrini
- Scarico automatico magazzino

### **🏷️ Etichette Barcode**
- Generazione PDF per singolo prodotto
- Stampa massiva etichette
- Layout ottimizzato per stampanti termiche
- QR code opzionali per info prodotto

### **👔 Sistema Multi-Taglia Avanzato**
- **Taglie standardizzate**: XS/40, S/42, M/44, L/46, XL/48, XXL/50, No
- **Creazione automatica varianti**: un prodotto per ogni taglia selezionata
- **Range di taglie**: selezione rapida da taglia iniziale a finale
- **Quantità individuali**: specifica quantità diversa per ogni taglia
- **Codici automatici**: generazione barcode univoci per ogni variante
- **Modalità singola**: per prodotti senza taglie multiple (accessori)
- **Validazione rigida**: solo taglie supportate dal sistema
- **Inventario separato**: ogni taglia è un'entità prodotto indipendente

Per dettagli completi, consulta: [`MULTI-SIZE-GUIDE.md`](./MULTI-SIZE-GUIDE.md)

### **📈 Report e Analytics**
- Statistiche vendite per periodo
- Analisi prodotti più venduti
- Report clienti fedeli
- Previsioni scorte
- Export dati in CSV/PDF

## 🛡️ **Sicurezza e Compliance**

### **Misure Implementate:**
- ✅ Crittografia dati sensibili
- ✅ Validazione input rigorosa
- ✅ Protezione CSRF/XSS
- ✅ Rate limiting avanzato
- ✅ Audit trail completo
- ✅ Backup automatici cifrati
- ✅ Monitoring sicurezza

### **Best Practices:**
- Password policy rigorose
- Scadenza sessioni configurabile
- Accesso basato su ruoli (RBAC)
- Logging attività sospette
- Update automatici sicurezza

## 🔄 **Backup e Manutenzione**

### **Backup Automatici:**
- Database: backup giornaliero automatico
- File uploads: sincronizzazione cloud
- Configurazioni: versionamento Git

### **Monitoraggio:**
- Health checks automatici
- Alerting su errori critici
- Monitoring performance
- Log rotation automatica

## 📞 **Supporto e Manutenzione**

### **Log Files Locations:**
- Backend: `./logs/`
- Nginx: `./docker/nginx/logs/`
- Database: Container logs

### **Troubleshooting Comuni:**
1. **Errore database**: Verificare credenziali in `.env`
2. **WhatsApp non funziona**: Controllare token e webhook
3. **2FA issues**: Reset via database per utenti admin
4. **Performance lente**: Verificare indici database

## 📄 **Licenza e Contributi**

Questo progetto è sviluppato per uso commerciale. 
Per contributi o supporto personalizzato, contattare il team di sviluppo.

---

## 📋 **Note di Versione**

### Versione Attuale (Ottobre 2025)
- ⚠️ **Modifica Vendite Temporaneamente Disabilitata**: La funzionalità di modifica delle vendite è stata rimossa per risolvere problemi tecnici con le transazioni MySQL2. La funzionalità sarà reimplementata con una architettura più robusta in una versione futura.
- ✅ **Funzionalità Disponibili**: Creazione vendite, visualizzazione, eliminazione, gestione prodotti e clienti
- 🔧 **Miglioramenti Tecnici**: Risolti problemi con prepared statements e comandi di transazione MySQL2

### Pianificato per Prossimo Rilascio
- 🔄 **Reimplementazione Modifica Vendite**: Sistema di modifica vendite completamente rinnovato
- 🛡️ **Sicurezza Transazioni**: Meccanismo transazionale più robusto per operazioni complesse
- 📊 **Audit Migliorato**: Tracciamento dettagliato delle modifiche alle vendite

---

## 🎯 **Roadmap Future**

- [ ] App mobile per inventory management
- [ ] Integrazione POS hardware
- [ ] Sincronizzazione e-commerce
- [ ] AI per previsioni vendite
- [ ] Dashboard analytics avanzate
- [ ] Multi-tenant support

---

**📧 Per supporto tecnico:** supporto@gestionale-abbigliamento.com
**🌐 Documentazione API:** [Link alla documentazione]
**📱 Status Page:** [Link status applicazione]
