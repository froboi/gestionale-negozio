# Sistema di Gestione Taglie Multi-Size

## Panoramica

Il sistema è stato aggiornato per supportare una gestione avanzata delle taglie dei prodotti. Ora è possibile creare prodotti con taglie multiple automaticamente, dove ogni taglia diventa un'entità prodotto separata nel database.

## Taglie Supportate

Il sistema supporta le seguenti taglie standardizzate:
- **XS/40** - Extra Small / Taglia 40
- **S/42** - Small / Taglia 42  
- **M/44** - Medium / Taglia 44
- **L/46** - Large / Taglia 46
- **XL/48** - Extra Large / Taglia 48
- **XXL/50** - Double Extra Large / Taglia 50
- **No** - Per prodotti senza taglia (accessori, ecc.)

## Modalità di Creazione Prodotti

### 1. Modalità Singola
Per prodotti con una sola taglia o senza taglia:
- Seleziona "Prodotto senza taglie multiple"
- Scegli una taglia dal menu a tendina
- Inserisci la quantità

### 2. Modalità Multi-Taglia
Per creare automaticamente più prodotti (uno per ogni taglia):
- Deseleziona "Prodotto senza taglie multiple"
- Imposta il range di taglie (Da/A)
- Inserisci la quantità specifica per ogni taglia
- Il sistema creerà automaticamente prodotti separati

## Funzionalità Backend

### Endpoint API

#### POST /api/products/multi-size
Crea multipli prodotti da un range di taglie:
```json
{
  "products": [
    {
      "code": "MAGLIA-001",
      "description": "Maglia Casual",
      "size": "S/42",
      "quantity": 5,
      "price": 25.99
    },
    {
      "code": "MAGLIA-001", 
      "description": "Maglia Casual",
      "size": "M/44",
      "quantity": 8,
      "price": 25.99
    }
  ]
}
```

#### POST /api/products
Crea singolo prodotto (comportamento tradizionale):
```json
{
  "code": "ACCESSORIO-001",
  "description": "Sciarpa",
  "size": "No",
  "quantity": 3,
  "price": 15.50
}
```

### Validazione
- Le taglie sono validate contro l'elenco supportato
- Tentare di utilizzare taglie non supportate risulterà in errore
- Il sistema assicura coerenza dei dati

## Generazione Codici Prodotto

Per i prodotti multi-taglia:
- Il codice base viene utilizzato per tutti i prodotti della serie
- Il sistema genera automaticamente varianti usando barcode univoci
- Ogni taglia mantiene il codice base ma ha ID e barcode separati

## Gestione Inventario

Ogni taglia è trattata come prodotto indipendente:
- Inventario separato per ogni taglia
- Prezzi possono variare per taglia (se necessario)
- Statistiche e reportistica per singola taglia

## Frontend - Interfaccia Utente

### Controlli Principali
1. **Checkbox "Prodotto senza taglie multiple"**
   - Attivato: modalità singola
   - Disattivato: modalità multi-taglia

2. **Selettori Range (modalità multi-taglia)**
   - "Da": taglia iniziale del range
   - "A": taglia finale del range

3. **Campi Quantità per Taglia (modalità multi-taglia)**
   - Un campo numerico per ogni taglia nel range selezionato
   - Visualizzazione dinamica basata sulla selezione

### Validazione Frontend
- Controllo che almeno una taglia sia selezionata in modalità multi
- Validazione quantità per ogni taglia
- Messaggi di errore informativi

## Testing

Utilizza il file `test-multi-size.js` per testare:
```bash
node test-multi-size.js
```

Il test verifica:
- Creazione prodotti multi-taglia
- Creazione prodotti singoli
- Validazione taglie non supportate
- Recupero prodotti

## Database

### Schema Prodotti
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(255),
  size ENUM('XS/40', 'S/42', 'M/44', 'L/46', 'XL/48', 'XXL/50', 'No'),
  color VARCHAR(255),
  quantity INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  -- altri campi...
);
```

### Migrazione Database
La colonna `size` è stata ricreata con vincoli ENUM per garantire consistenza:
```sql
ALTER TABLE products DROP COLUMN size;
ALTER TABLE products ADD COLUMN size ENUM('XS/40', 'S/42', 'M/44', 'L/46', 'XL/48', 'XXL/50', 'No') AFTER category;
```

## Note di Sviluppo

### Modifiche Principali
1. **Backend**: Nuovo endpoint `/multi-size` in `routes/products.js`
2. **Frontend**: Completa riscrittura di `Products.tsx` con gestione multi-taglia
3. **Database**: Schema aggiornato con enum per taglie
4. **Validazione**: Controlli sia lato client che server

### Compatibilità
- Sistema retrocompatibile con prodotti esistenti
- I prodotti con taglie non standard sono stati rimossi durante la migrazione
- Nuovi prodotti devono utilizzare le taglie standardizzate

## Prossimi Sviluppi

Funzionalità future pianificate:
- Import/export CSV per prodotti multi-taglia
- Template di creazione rapida per collezioni
- Gestione colori multipli per stesso prodotto/taglia
- Reportistica avanzata per analisi taglie