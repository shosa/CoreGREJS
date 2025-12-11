# Architettura API Mobile Unificata

## Panoramica

Il sistema è stato unificato per centralizzare la gestione delle API mobile mantenendo la piena retrocompatibilità con le app esistenti.

## Struttura Unificata

### Controller Principale: `MobileApiController`

Un controller centralizzato che gestisce tutte le funzionalità comuni a tutte le app mobile.

#### Endpoints Unificati

```
POST /api/mobile/login                     - Login unificato per tutte le app
GET  /api/mobile/profile?id=1              - Profilo operatore con statistiche app-specific
GET  /api/mobile/daily-summary?id=1&data=2025-09-19 - Riepilogo giornaliero per app specifica
GET  /api/mobile/system-data               - Dati sistema (reparti, linee, taglie, laboratori, etc.)
POST /api/mobile/check-data                - Verifica cartellino/commessa unificata
```

### Identificazione App

Il sistema supporta due modalità per distinguere le app:

1. **Header HTTP**: `X-App-Type: quality|repairs`
2. **Parametro JSON**: `app_type: "quality"|"repairs"`

### Tipi di App Supportate

- **`quality`**: App controllo qualità (esistente)
- **`repairs`**: App riparazioni interne (nuova)

## Login Unificato

### Endpoint: `POST /api/mobile/login`

```json
{
    "action": "login",
    "username": "mario.rossi",
    "password": "1234",
    "app_type": "quality"  // opzionale se header presente
}
```

### Risposta con Dati App-Specific

```json
{
    "status": "success",
    "message": "Login effettuato con successo",
    "data": {
        "id": 1,
        "user": "mario.rossi",
        "full_name": "Mario Rossi",
        "reparto": "Produzione",
        "app_type": "quality",
        "permissions": ["cq_view", "cq_create", "cq_edit"],
        "features": ["hermes_cq", "photo_upload", "barcode_scan", "reports"]
    }
}
```

## Gestione Dati Sistema

### Endpoint: `GET /api/mobile/system-data`

Parametri:
- `type`: `all|reparti|linee|taglie|quality|repairs`
- `nu`: per taglie specifiche

Esempi:
```
GET /api/mobile/system-data?type=all        - Tutti i dati
GET /api/mobile/system-data?type=reparti    - Solo reparti
GET /api/mobile/system-data?type=taglie&nu=5 - Taglie per numerata 5
GET /api/mobile/system-data?type=quality    - Dati specifici CQ (reparti_hermes, difetti)
GET /api/mobile/system-data?type=repairs    - Dati specifici riparazioni (laboratori, causali)
```

## Statistiche App-Specific

### Quality App
```json
{
    "statistiche": {
        "totale_controlli": 150,
        "controlli_oggi": 8
    }
}
```

### Repairs App
```json
{
    "statistiche": {
        "totale_riparazioni": 45,
        "riparazioni_incomplete": 12,
        "riparazioni_oggi": 3
    }
}
```

## Retrocompatibilità

Le API esistenti continuano a funzionare senza modifiche:

### Quality API (mantiene tutti gli endpoint esistenti)
```
POST /api/quality/login
POST /api/quality/check-cartellino
POST /api/quality/save-hermes-cq
...etc
```

### Riparazioni Interne API (funzionalità specifiche)
```
GET  /api/riparazioni-interne                      - Lista riparazioni
GET  /api/riparazioni-interne/show?id=000001       - Visualizza singola
POST /api/riparazioni-interne                      - Crea nuova riparazione
POST /api/riparazioni-interne/update               - Aggiorna riparazione
POST /api/riparazioni-interne/complete             - Completa riparazione
POST /api/riparazioni-interne/delete               - Elimina riparazione
POST /api/riparazioni-interne/options              - Opzioni per form (NEW)
POST /api/riparazioni-interne/cartellino-details   - Dettagli cartellino (NEW)
GET  /api/riparazioni-interne/pdf?id=000001        - Genera PDF cedola (NEW)
GET  /api/riparazioni-interne/stats                - Statistiche (NEW)
```

### Operators API (mantiene compatibilità)
```
POST /api/operators/login
GET  /api/operators/{id}
...etc
```

## Database

### Tabella Unificata: `operators`
```sql
CREATE TABLE operators (
    id int(11) PRIMARY KEY AUTO_INCREMENT,
    user varchar(255) NOT NULL,
    full_name varchar(255) NOT NULL,
    pin int(11) NOT NULL,
    reparto varchar(255) NOT NULL
);
```

Usata da:
- App Quality (controllo qualità)
- App Repairs (riparazioni interne)
- Futture app mobile

### Tabelle App-Specific

#### Quality: tabelle esistenti CQ
- `cq_hermes_records`
- `cq_hermes_eccezioni`
- `cq_hermes_reparti`
- etc.

#### Repairs: nuova tabella
- `riparazioni_interne`

## Migrazione per App Esistenti

### Opzione 1: Migrazione Graduale
1. App continua ad usare `/api/quality/*`
2. Aggiornamento futuro per usare `/api/mobile/*`

### Opzione 2: Migrazione Immediata
1. Aggiorna app per usare `/api/mobile/login`
2. Aggiungi header `X-App-Type: quality`
3. Benefici immediati del sistema unificato

## Vantaggi del Sistema Unificato

1. **Codice Centralizzato**: Meno duplicazione, più facile manutenzione
2. **Login Unificato**: Un solo endpoint per tutte le app
3. **Gestione Permessi**: Sistema centralizzato per autorizzazioni
4. **Scalabilità**: Facile aggiunta di nuove app mobile
5. **Consistenza**: Struttura uniforme per tutte le risposte
6. **Retrocompatibilità**: Nessuna rottura delle app esistenti

## File di Test

- `test_unified_api.php`: Test completo sistema unificato
- `test_api_endpoints.php`: Test endpoint singoli (legacy)
- `test_api_setup.sql`: Dati di esempio

## Struttura File

```
app/controllers/
├── MobileApiController.php        (nuovo - unificato)
├── QualityApiController.php       (esistente - mantenuto)
├── OperatorsApiController.php     (nuovo - compatibilità)
└── RiparazioniInterneApiController.php (nuovo - specifico)

database/migrations/
├── 20250919_0001_create_operators.php
└── 20250919_0002_create_riparazioni_interne.php
```

## Configurazione Mobile App

### Headers Raccomandati
```http
Content-Type: application/json
Accept: application/json
X-App-Type: quality|repairs
```

### Esempio Implementazione Login
```javascript
// Nuovo sistema unificato
const loginData = {
    action: 'login',
    username: 'mario.rossi',
    password: '1234',
    app_type: 'quality'
};

fetch('/api/mobile/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-App-Type': 'quality'
    },
    body: JSON.stringify(loginData)
});
```

## Workflow App-Specific

### Quality App Workflow
```javascript
// 1. Login
POST /api/mobile/login (app_type: 'quality')

// 2. Dati sistema CQ
GET /api/mobile/system-data?type=quality

// 3. Verifica cartellino
POST /api/mobile/check-data {type: 'cartellino', value: 'CT001'}

// 4. Dettagli cartellino per CQ
POST /api/quality/cartellino-details {cartellino: 'CT001'}

// 5. Opzioni per controllo qualità
POST /api/quality/options {cartellino: 'CT001'}

// 6. Salva controllo Hermes
POST /api/quality/save-hermes-cq {...}
```

### Repairs App Workflow (Updated - Simplified URLs)
```javascript
// 1. Login
POST /api/mobile/login (app_type: 'repairs')

// 2. Dati sistema riparazioni
GET /api/mobile/system-data?type=repairs

// 3. Verifica cartellino
POST /api/mobile/check-data {type: 'cartellino', value: 'CT001'}

// 4. Dettagli cartellino per pre-compilazione
POST /api/riparazioni-interne/cartellino-details {cartellino: 'CT001'}

// 5. Opzioni per form riparazione
POST /api/riparazioni-interne/options {cartellino: 'CT001'}

// 6. Crea riparazione
POST /api/riparazioni-interne {...}

// 7. Visualizza riparazione
GET /api/riparazioni-interne/show?id=000001

// 8. Aggiorna riparazione
POST /api/riparazioni-interne/update {id: '000001', ...}

// 9. Completa riparazione
POST /api/riparazioni-interne/complete {id: '000001'}

// 10. Elimina riparazione (se necessario)
POST /api/riparazioni-interne/delete {id: '000001'}

// 11. Genera PDF cedola riparazione
GET /api/riparazioni-interne/pdf?id=000001
```

## Nuove Funzionalità Aggiunte

### Riparazioni Interne - Options API
```javascript
// Endpoint: POST /api/riparazioni-interne/options
{
    "cartellino": "CT001"  // opzionale
}

// Response:
{
    "calzate": ["35", "36", "37"],
    "reparti": [{"sigla": "PR", "nome": "Produzione"}],
    "linee": [{"sigla": "01", "descrizione": "Linea 1"}],
    "laboratori": [{"id": 1, "nome": "Lab Riparazioni"}],
    "causali_frequenti": ["Difetto suola", "Problema cucitura"]
}
```

### Riparazioni Interne - Cartellino Details API
```javascript
// Endpoint: POST /api/riparazioni-interne/cartellino-details
{
    "cartellino": "CT001"
}

// Response con dati pre-compilazione:
{
    "cartellino_info": {...},
    "linea_info": {...},
    "riparazione_info": {
        "nuovo_id": "RI000001",
        "data": "19/09/2025",
        "taglie_disponibili": [
            {"numero": 1, "nome": "35", "field": "P01"}
        ]
    }
}
```

### Riparazioni Interne - PDF Generation API
```javascript
// Endpoint: GET /api/riparazioni-interne/pdf?id=000001

// Description:
// Genera una cedola PDF per la riparazione interna specificata
// Simile al sistema principale ma adattato per riparazioni_interne

// Response:
// - Headers: Content-Type: application/pdf
// - Headers: Content-Disposition: attachment; filename="CEDOLA_INTERNA_000001_20250922_143022.pdf"
// - Body: Binary PDF data (download automatico)

// Features:
// - Header aziendale con barcode ID riparazione
// - Informazioni laboratorio e reparto
// - Dati cartellino, commessa, quantità, linea
// - Articolo collegato dalla tabella dati
// - Matrice taglie (20 colonne) con quantità P01-P20
// - Sezione causale riparazione con indicazione urgenza
// - Footer con ID riparazione e data creazione
// - Activity logging automatico

// Error Response:
{
    "status": "error",
    "message": "ID riparazione mancante"  // or "Riparazione non trovata"
}

// Usage Example:
// Direct download link for mobile apps:
// GET https://api.domain.com/api/riparazioni-interne/pdf?id=000001
// Browser will automatically download the PDF file
```

### Mobile System Data - Dati App-Specific
```javascript
// Quality App Data
GET /api/mobile/system-data?type=quality
// Returns: reparti_hermes, difetti per controllo qualità

// Repairs App Data
GET /api/mobile/system-data?type=repairs
// Returns: laboratori, causali_frequenti per riparazioni

// All Data
GET /api/mobile/system-data?type=all
// Returns: tutto + dati specifici per entrambe le app
```

## Aggiornamenti Recenti (v2.1)

### Semplificazione URL API (BREAKING CHANGE)
- ❌ **Rimosso**: URL con `{id}` che causavano problemi di routing
- ✅ **Aggiunto**: URL semplificati con parametri query o JSON body
- ✅ **Metodi unificati**: Solo GET e POST per massima compatibilità

#### Prima (v2.0):
```javascript
GET /api/mobile/profile/{id}
GET /api/mobile/daily-summary/{id}
PUT /api/riparazioni-interne/{id}
DELETE /api/riparazioni-interne/{id}
```

#### Dopo (v2.1):
```javascript
GET /api/mobile/profile?id=1
GET /api/mobile/daily-summary?id=1&data=2025-09-19
POST /api/riparazioni-interne/update {id: '000001', ...}
POST /api/riparazioni-interne/delete {id: '000001'}
```

### Nuove API Riparazioni Interne (v2.1)
- ✅ **Options API**: `/api/riparazioni-interne/options` per form data
- ✅ **Cartellino Details API**: `/api/riparazioni-interne/cartellino-details` per pre-compilazione
- ✅ **PDF Generation API**: `/api/riparazioni-interne/pdf?id=000001` per cedole
- ✅ **Statistics API**: `/api/riparazioni-interne/stats` per analytics
- ✅ **Sistema Mobile esteso**: supporto `type=repairs` con laboratori e causali

### Miglioramenti UX
- **Pre-compilazione automatica**: cartellino → tutti i dati necessari
- **Form ottimizzato**: calzate, reparti, linee, laboratori disponibili
- **Autocomplete**: causali più frequenti per suggestions
- **Workflow semplificato**: meno step, più automazione
- **PDF Generation**: cedole professionali con download diretto

### Performance e Scalabilità
- **Caching intelligente**: causali frequenti (ultimi 50)
- **Query ottimizzate**: JOIN solo quando necessari
- **Response strutturata**: taglie con mapping field automatico
- **PDF ottimizzato**: generazione on-demand senza caching
- **Error handling**: consistente su tutti gli endpoint

### Benefici Sviluppo Mobile
1. **Time-to-market ridotto**: API complete per entrambe le app
2. **Manutenibilità**: sistema unificato, meno duplicazione
3. **Consistenza**: stessi pattern Quality → Repairs
4. **Estendibilità**: facile aggiunta di nuove app mobile
5. **Backward compatibility**: 100% compatibilità esistente
6. **Funzionalità complete**: CRUD + PDF + Analytics integrate

Questa architettura fornisce una base solida e scalabile per tutte le future API mobile mantenendo piena compatibilità con il sistema esistente.