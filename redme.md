# Gestionale Abbigliamento Sicuro

## 📌 Descrizione
Una **web app gestionale sicura** per negozio di vestiti.  
Funzionalità principali:
- Magazzino con prodotti (codice, taglia, colore, prezzo, barcode).
- Gestione clienti con fidelity digitale (storico acquisti).
- Pannello Admin con statistiche e ruoli.
- Barcode **stampabile** con PDF contenente **barcode + taglia**.
- Invio automatico di messaggi di compleanno via **WhatsApp Business API ufficiale**.

---

## 🔐 Sicurezza
- Password salvate con **bcrypt/argon2**.
- **2FA obbligatoria** per il profilo tecnico.
- Query **parametrizzate** (no SQL injection).
- Protezioni **CSRF, XSS, brute force**.
- Comunicazioni solo via **HTTPS/TLS**.
- Dati sensibili cifrati nel database.
- Audit log delle azioni critiche.
- Rate limiting sugli accessi.
- Deployment isolato con **Docker + Nginx**.

---

## ⚙️ Architettura
- **Backend**: Node.js (Express) o Django.
- **Database**: MySQL o MariaDB.
- **Frontend**: React/Next.js.
- **Deployment**: Docker + Nginx reverse proxy su server dedicato.
- **Logging**: centralizzato e sicuro.

---

## 🚀 Funzionalità
1. **Magazzino**
   - Prodotti con barcode univoco.
   - **Generazione PDF stampabile con barcode + taglia**.
   - Scarico automatico dal magazzino al momento dell’acquisto.

2. **Clienti**
   - Scheda con Nome, Cognome, Email, Telefono, Data nascita.
   - Storico acquisti.
   - Aggiunta e ricerca clienti.

3. **Fidelity card digitale**
   - Storico acquisti = fidelity.
   - Possibilità di sconti personalizzati.

4. **Scontistica e compleanni**
   - Controllo giornaliero compleanni.
   - Invio automatico messaggi WhatsApp con sconto.

5. **Pannello Admin**
   - Statistiche vendite e magazzino.
   - Gestione utenti e ruoli.
   - Audit log delle azioni critiche.

---

## 🛡️ Requisiti hosting
- Server dedicato acceso 24/7.
- HTTPS obbligatorio.
- Backup automatici cifrati.

---

## 🖨️ Esempio di etichetta PDF
Ogni etichetta prodotto deve mostrare:

┌───────────────────────┐

│ CODICE: ABC123 │

│ TAGLIA: M │

│ BARCODE: |||||||||||| │

└───────────────────────┘

markdown
Copia codice

- Il **barcode** deve essere leggibile da pistola scanner.  
- La **taglia** deve essere chiara e visibile per l’operatore in negozio.  
- Generazione PDF automatica per stampa singola o multipla.