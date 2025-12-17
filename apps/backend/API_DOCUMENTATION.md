# CoreGREJS Backend API Documentation

**Version:** 1.0.0
**Framework:** NestJS 10.3
**Database:** MySQL + Prisma ORM
**Base URL:** `http://localhost:3011/api`
**Swagger Docs:** `http://localhost:3011/api/docs`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization & Permissions](#authorization--permissions)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [API Endpoints by Module](#api-endpoints-by-module)
   - [Auth](#auth-module)
   - [Users](#users-module)
   - [Produzione](#produzione-module)
   - [Quality](#quality-module)
   - [Riparazioni](#riparazioni-module)
   - [SCM](#scm-module)
   - [Export](#export-module)
   - [Tracking](#tracking-module)
   - [Jobs](#jobs-module)
   - [File Manager](#file-manager-module)
   - [Mobile](#mobile-module)
   - [Other Modules](#other-modules)
7. [Job Queue System](#job-queue-system)
8. [File Upload & Storage](#file-upload--storage)

---

## Overview

CoreGREJS è un sistema ERP completo per la gestione della produzione, qualità, riparazioni, supply chain, export e tracking dei lotti.

### Architettura

- **Backend**: NestJS 10.3 con TypeScript
- **Database**: MySQL con Prisma ORM
- **Autenticazione**: JWT + Passport.js
- **File Storage**: MinIO (S3-compatible)
- **Job Queue**: BullMQ (Redis-based)
- **Search Engine**: MeiliSearch
- **Email**: Nodemailer
- **PDF Generation**: PDFKit + pdf-lib
- **Excel**: ExcelJS

### Moduli Principali

Il backend è suddiviso in 27 moduli funzionali:

| Modulo | Descrizione |
|--------|-------------|
| **auth** | Autenticazione JWT |
| **users** | Gestione utenti e permessi |
| **produzione** | Dati produzione giornaliera, fasi, reparti |
| **quality** | Controllo qualità, difetti, eccezioni |
| **riparazioni** | Riparazioni esterne, laboratori |
| **scm** | Supply Chain Management, lanci produzione |
| **export** | DDT, terzisti, articoli master |
| **tracking** | Tracciamento lotti-cartellini |
| **jobs** | Gestione job asincroni |
| **file-manager** | Gestione file storage |
| **mobile** | API dedicate mobile app |
| **health** | Health check endpoint |
| **activity-log** | Log attività utenti |
| **notifications** | Sistema notifiche |
| **storage** | Interfaccia MinIO |
| **email** | Servizio invio email |
| **search** | Ricerca full-text |
| **settings** | Configurazioni sistema |
| **widgets** | Dati widget dashboard |

---

## Authentication

### Login Flow

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Login effettuato con successo",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "nome": "Mario",
      "cognome": "Rossi",
      "email": "admin@coregre.com",
      "attivo": true,
      "ruolo": "admin"
    }
  }
}
```

### Using JWT Token

Include il token JWT in tutti i request successivi:

```http
GET /api/produzione/calendar
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

- **Default Expiry**: 7 giorni
- **Refresh**: Eseguire nuovo login quando il token scade

---

## Authorization & Permissions

### Permission System

Il sistema utilizza permessi granulari per modulo. Ogni utente ha permessi specifici definiti in `user_permissions` table.

**Permessi Disponibili:**
- `produzione` - Accesso modulo produzione
- `qualita` - Accesso modulo qualità
- `riparazioni` - Accesso riparazioni
- `scm_admin` - Accesso SCM
- `export` - Accesso export/DDT
- `tracking` - Accesso tracking
- `admin` - Accesso amministrazione utenti

### Guards Applicati

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('produzione')
```

**Flow di Autorizzazione:**
1. `JwtAuthGuard` - Valida token JWT
2. `PermissionsGuard` - Verifica:
   - Modulo abilitato nelle impostazioni (`settings.module.{modulo}.enabled`)
   - Utente ha il permesso richiesto
   - Cache TTL: 60 secondi

### Public Endpoints

Alcuni endpoint non richiedono autenticazione:
- `GET /api/auth/health`
- `GET /api/health`

Usano il decorator `@Public()` per bypassare `JwtAuthGuard`.

---

## Response Format

### Success Response

```json
{
  "statusCode": 200,
  "message": "Operazione completata con successo",
  "data": {
    ...
  },
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Il campo 'nome' è obbligatorio",
  "error": "Bad Request",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "path": "/api/produzione/phases"
}
```

### Pagination Response

```json
{
  "statusCode": 200,
  "data": {
    "items": [...],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate entry |
| 500 | Internal Server Error | Server error |

### Validation Errors

Le validazioni DTO ritornano messaggi in italiano:

```json
{
  "statusCode": 400,
  "message": [
    "Il campo 'username' è obbligatorio",
    "Il campo 'email' deve essere un'email valida",
    "Il campo 'password' deve avere almeno 8 caratteri"
  ],
  "error": "Bad Request"
}
```

### Database Errors

Gestiti da `PrismaExceptionFilter`:

```json
{
  "statusCode": 409,
  "message": "Un record con questo valore esiste già",
  "error": "Conflict"
}
```

---

## API Endpoints by Module

---

## Auth Module

Base path: `/api/auth`

### POST /auth/login
Effettua login e riceve JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "admin@coregre.com",
    "attivo": true,
    "ruolo": "admin"
  }
}
```

---

### GET /auth/profile
Recupera profilo utente corrente.

**Auth:** JWT Required

**Response:** `200 OK`
```json
{
  "id": 1,
  "username": "admin",
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "admin@coregre.com",
  "attivo": true,
  "ruolo": "admin",
  "permissions": ["produzione", "qualita", "admin"]
}
```

---

### PUT /auth/profile
Aggiorna profilo utente corrente.

**Auth:** JWT Required

**Request:**
```json
{
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "mario.rossi@coregre.com"
}
```

**Response:** `200 OK`

---

### POST /auth/change-password
Cambia password utente corrente.

**Auth:** JWT Required

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:** `200 OK`

---

### GET /auth/health
Health check endpoint (no auth required).

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

---

## Users Module

Base path: `/api/users`

**Auth:** JWT Required
**Permissions:** `admin`

### GET /users
Lista tutti gli utenti con pagination e filtri.

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string, optional) - Ricerca per username, nome, cognome, email
- `attivo` (boolean, optional) - Filtra per stato attivo

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "username": "admin",
      "nome": "Mario",
      "cognome": "Rossi",
      "email": "admin@coregre.com",
      "attivo": true,
      "ruolo": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-15T14:30:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### GET /users/stats
Statistiche utenti.

**Response:** `200 OK`
```json
{
  "total": 50,
  "active": 45,
  "inactive": 5,
  "byRole": {
    "admin": 5,
    "operator": 30,
    "viewer": 15
  }
}
```

---

### GET /users/:id
Dettagli singolo utente.

**Response:** `200 OK`
```json
{
  "id": 1,
  "username": "admin",
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "admin@coregre.com",
  "attivo": true,
  "ruolo": "admin",
  "permissions": ["produzione", "qualita", "admin"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T14:30:00.000Z"
}
```

---

### POST /users
Crea nuovo utente.

**Request:**
```json
{
  "username": "newuser",
  "password": "password123",
  "nome": "Luigi",
  "cognome": "Verdi",
  "email": "luigi.verdi@coregre.com",
  "attivo": true,
  "ruolo": "operator"
}
```

**Response:** `201 Created`

---

### PUT /users/:id
Aggiorna utente esistente.

**Request:**
```json
{
  "nome": "Luigi",
  "cognome": "Verdi",
  "email": "luigi.verdi@coregre.com",
  "attivo": true,
  "ruolo": "operator"
}
```

**Response:** `200 OK`

---

### DELETE /users/:id
Elimina utente.

**Response:** `200 OK`

---

### POST /users/delete-bulk
Elimina multipli utenti.

**Request:**
```json
{
  "ids": [2, 3, 4]
}
```

**Response:** `200 OK`

---

### GET /users/:id/permissions
Recupera permessi utente.

**Response:** `200 OK`
```json
{
  "userId": 1,
  "permissions": [
    {
      "module": "produzione",
      "enabled": true
    },
    {
      "module": "qualita",
      "enabled": true
    },
    {
      "module": "admin",
      "enabled": true
    }
  ]
}
```

---

### PUT /users/:id/permissions
Aggiorna permessi utente.

**Request:**
```json
{
  "permissions": [
    { "module": "produzione", "enabled": true },
    { "module": "qualita", "enabled": true },
    { "module": "riparazioni", "enabled": false }
  ]
}
```

**Response:** `200 OK`

---

## Produzione Module

Base path: `/api/produzione`

**Auth:** JWT Required
**Permissions:** `produzione`

### Production Phases

#### GET /produzione/phases
Lista tutte le fasi di produzione.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "nome": "Taglio",
    "ordine": 1,
    "attivo": true
  },
  {
    "id": 2,
    "nome": "Cucitura",
    "ordine": 2,
    "attivo": true
  }
]
```

---

#### POST /produzione/phases
Crea nuova fase.

**Request:**
```json
{
  "nome": "Stiro",
  "ordine": 3,
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /produzione/phases/:id
Aggiorna fase esistente.

**Request:**
```json
{
  "nome": "Stiro e Finishing",
  "ordine": 3,
  "attivo": true
}
```

**Response:** `200 OK`

---

#### DELETE /produzione/phases/:id
Elimina fase.

**Response:** `200 OK`

---

### Production Departments

#### GET /produzione/departments
Lista tutti i reparti.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "nome": "Reparto A",
    "descrizione": "Taglio e preparazione",
    "attivo": true
  }
]
```

---

#### POST /produzione/departments
Crea nuovo reparto.

**Request:**
```json
{
  "nome": "Reparto C",
  "descrizione": "Controllo finale",
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /produzione/departments/:id
Aggiorna reparto.

**Response:** `200 OK`

---

#### DELETE /produzione/departments/:id
Elimina reparto.

**Response:** `200 OK`

---

### Production Calendar & Statistics

#### GET /produzione/calendar
Calendario produzione mensile.

**Query Params:**
- `month` (number, 1-12) - Required
- `year` (number, YYYY) - Required

**Example:** `/produzione/calendar?month=1&year=2025`

**Response:** `200 OK`
```json
{
  "month": 1,
  "year": 2025,
  "days": [
    {
      "date": "2025-01-15",
      "totalProduced": 1250,
      "targetProduction": 1500,
      "efficiency": 83.3,
      "hasData": true
    }
  ],
  "summary": {
    "totalProduction": 35000,
    "avgEfficiency": 87.5,
    "workingDays": 22
  }
}
```

---

#### GET /produzione/today
Dati produzione di oggi.

**Response:** `200 OK`
```json
{
  "date": "2025-01-15",
  "totalProduced": 1250,
  "targetProduction": 1500,
  "efficiency": 83.3,
  "byDepartment": [
    {
      "department": "Reparto A",
      "produced": 500,
      "target": 600,
      "efficiency": 83.3
    }
  ],
  "byPhase": [
    {
      "phase": "Taglio",
      "produced": 1250,
      "target": 1500
    }
  ]
}
```

---

#### GET /produzione/week
Statistiche settimana corrente.

**Response:** `200 OK`
```json
{
  "weekNumber": 3,
  "year": 2025,
  "startDate": "2025-01-13",
  "endDate": "2025-01-19",
  "totalProduced": 6250,
  "targetProduction": 7500,
  "efficiency": 83.3,
  "dailyData": [...]
}
```

---

#### GET /produzione/month
Statistiche mese specifico.

**Query Params:**
- `month` (number, 1-12) - Required
- `year` (number, YYYY) - Required

**Response:** `200 OK`
```json
{
  "month": 1,
  "year": 2025,
  "totalProduced": 35000,
  "targetProduction": 40000,
  "efficiency": 87.5,
  "workingDays": 22,
  "avgDailyProduction": 1590
}
```

---

#### GET /produzione/trend
Trend produzione ultimi N giorni.

**Query Params:**
- `days` (number, default: 30) - Numero giorni

**Response:** `200 OK`
```json
{
  "days": 30,
  "data": [
    {
      "date": "2025-01-15",
      "produced": 1250,
      "target": 1500,
      "efficiency": 83.3
    }
  ],
  "trend": {
    "avgProduction": 1450,
    "avgEfficiency": 86.2,
    "maxProduction": 1800,
    "minProduction": 1000
  }
}
```

---

#### GET /produzione/recent
Ultimi N record di produzione.

**Query Params:**
- `limit` (number, default: 15)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "date": "2025-01-15",
    "totalProduced": 1250,
    "efficiency": 83.3,
    "createdAt": "2025-01-15T08:00:00.000Z"
  }
]
```

---

#### GET /produzione/machine-performance
Performance macchine.

**Response:** `200 OK`
```json
{
  "machines": [
    {
      "machineId": "M001",
      "machineName": "Macchina Taglio 1",
      "totalProduced": 15000,
      "efficiency": 92.5,
      "downtime": 2.5,
      "lastMaintenance": "2025-01-10"
    }
  ]
}
```

---

#### GET /produzione/comparison
Confronto periodi.

**Query Params:**
- `startDate1` (date, YYYY-MM-DD)
- `endDate1` (date, YYYY-MM-DD)
- `startDate2` (date, YYYY-MM-DD)
- `endDate2` (date, YYYY-MM-DD)

**Response:** `200 OK`
```json
{
  "period1": {
    "start": "2025-01-01",
    "end": "2025-01-15",
    "totalProduced": 22500,
    "avgEfficiency": 87.5
  },
  "period2": {
    "start": "2024-12-01",
    "end": "2024-12-15",
    "totalProduced": 20000,
    "avgEfficiency": 85.0
  },
  "difference": {
    "production": "+12.5%",
    "efficiency": "+2.5%"
  }
}
```

---

### Daily Production Data

#### GET /produzione/date/:date
Recupera dati produzione per una data specifica.

**Path Params:**
- `date` (string, YYYY-MM-DD) - Data

**Example:** `/produzione/date/2025-01-15`

**Response:** `200 OK`
```json
{
  "date": "2025-01-15",
  "departments": [
    {
      "departmentId": 1,
      "departmentName": "Reparto A",
      "phases": [
        {
          "phaseId": 1,
          "phaseName": "Taglio",
          "produced": 500,
          "target": 600,
          "efficiency": 83.3
        }
      ]
    }
  ],
  "totalProduced": 1250,
  "totalTarget": 1500,
  "overallEfficiency": 83.3
}
```

---

#### POST /produzione/date/:date
Salva/aggiorna dati produzione giornaliera.

**Path Params:**
- `date` (string, YYYY-MM-DD)

**Request:**
```json
{
  "departments": [
    {
      "departmentId": 1,
      "phases": [
        {
          "phaseId": 1,
          "produced": 500,
          "target": 600,
          "notes": "Produzione regolare"
        }
      ]
    }
  ]
}
```

**Response:** `201 Created`

---

#### PUT /produzione/date/:date
Alias per POST - aggiorna dati produzione.

---

### Reports & Export

#### GET /produzione/pdf/:date
Genera report PDF produzione (job asincrono).

**Path Params:**
- `date` (string, YYYY-MM-DD)

**Response:** `202 Accepted`
```json
{
  "jobId": "job_123456789",
  "status": "pending",
  "message": "Generazione PDF in corso"
}
```

**Nota:** Usa `/api/jobs/:jobId` per verificare lo stato e scaricare il PDF completato.

---

#### POST /produzione/email/:date
Invia report PDF via email.

**Path Params:**
- `date` (string, YYYY-MM-DD)

**Request:**
```json
{
  "recipients": ["manager@coregre.com", "admin@coregre.com"],
  "subject": "Report Produzione 15/01/2025"
}
```

**Response:** `200 OK`

---

#### POST /produzione/process-csv
Upload e processamento file CSV produzione.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (file) - File CSV

**Response:** `200 OK`
```json
{
  "processed": 150,
  "errors": [],
  "summary": {
    "totalProduced": 35000,
    "avgEfficiency": 87.5
  }
}
```

---

#### POST /produzione/generate-csv-report
Genera report da dati CSV (job asincrono).

**Request:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "format": "pdf"
}
```

**Response:** `202 Accepted`

---

## Quality Module

Base path: `/api/quality`

**Auth:** JWT Required
**Permissions:** `qualita`

### Dashboard

#### GET /quality/dashboard/stats
Statistiche dashboard qualità.

**Response:** `200 OK`
```json
{
  "totalRecords": 1500,
  "totalDefects": 85,
  "defectRate": 5.67,
  "totalExceptions": 12,
  "exceptionRate": 0.8,
  "byDepartment": [
    {
      "departmentId": 1,
      "departmentName": "Reparto A",
      "records": 500,
      "defects": 25,
      "defectRate": 5.0
    }
  ],
  "topDefects": [
    {
      "defectType": "Cucitura irregolare",
      "count": 30,
      "percentage": 35.3
    }
  ]
}
```

---

#### GET /quality/dashboard/weekly-records
Record controlli settimanali.

**Response:** `200 OK`
```json
{
  "weekNumber": 3,
  "year": 2025,
  "dailyRecords": [
    {
      "date": "2025-01-15",
      "total": 75,
      "defects": 4,
      "defectRate": 5.33
    }
  ],
  "weekTotal": 450,
  "weekDefects": 25,
  "weekDefectRate": 5.56
}
```

---

#### GET /quality/dashboard/exceptions-by-department
Eccezioni per reparto.

**Response:** `200 OK`
```json
[
  {
    "departmentId": 1,
    "departmentName": "Reparto A",
    "exceptions": 5,
    "lastException": "2025-01-14T10:30:00.000Z"
  }
]
```

---

#### GET /quality/dashboard/defect-rate-by-department
Tasso difetti per reparto.

**Response:** `200 OK`
```json
[
  {
    "departmentId": 1,
    "departmentName": "Reparto A",
    "totalRecords": 500,
    "defects": 25,
    "defectRate": 5.0
  }
]
```

---

### Departments

#### GET /quality/departments
Lista reparti qualità.

**Response:** `200 OK`

---

#### GET /quality/departments/:id
Singolo reparto.

**Response:** `200 OK`

---

#### POST /quality/departments
Crea reparto qualità.

**Request:**
```json
{
  "nome": "Controllo Finale",
  "descrizione": "Controllo qualità finale",
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /quality/departments/:id
Aggiorna reparto.

**Response:** `200 OK`

---

#### DELETE /quality/departments/:id
Elimina reparto.

**Response:** `200 OK`

---

### Defect Types

#### GET /quality/defect-types
Lista tipi di difetto.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "nome": "Cucitura irregolare",
    "categoria": "Cucitura",
    "gravita": "media",
    "attivo": true
  }
]
```

---

#### GET /quality/defect-types/:id
Singolo tipo difetto.

**Response:** `200 OK`

---

#### POST /quality/defect-types
Crea tipo difetto.

**Request:**
```json
{
  "nome": "Bottone mancante",
  "categoria": "Accessori",
  "gravita": "alta",
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /quality/defect-types/:id
Aggiorna tipo difetto.

**Response:** `200 OK`

---

#### DELETE /quality/defect-types/:id
Elimina tipo difetto.

**Response:** `200 OK`

---

### Operators

#### GET /quality/operators
Lista operatori qualità.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "username": "op001",
    "nome": "Mario",
    "cognome": "Rossi",
    "pin": "1234",
    "attivo": true
  }
]
```

---

#### GET /quality/operators/:username
Singolo operatore per username.

**Response:** `200 OK`

---

#### POST /quality/operators/authenticate
Autentica operatore con PIN.

**Request:**
```json
{
  "username": "op001",
  "pin": "1234"
}
```

**Response:** `200 OK`
```json
{
  "authenticated": true,
  "operator": {
    "id": 1,
    "username": "op001",
    "nome": "Mario",
    "cognome": "Rossi"
  }
}
```

---

### Quality Records

#### GET /quality/records
Lista record controlli qualità con pagination e filtri.

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `startDate` (date, YYYY-MM-DD, optional)
- `endDate` (date, YYYY-MM-DD, optional)
- `departmentId` (number, optional)
- `operatorId` (number, optional)
- `hasDefects` (boolean, optional)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "dataControllo": "2025-01-15T10:30:00.000Z",
      "cartellino": "CART001",
      "commessa": "COM123",
      "articolo": "ART456",
      "quantita": 50,
      "difetti": 2,
      "departmentId": 1,
      "operatorId": 1,
      "defectTypes": [
        {
          "defectTypeId": 1,
          "nome": "Cucitura irregolare",
          "quantity": 2
        }
      ]
    }
  ],
  "total": 1500,
  "page": 1,
  "limit": 50,
  "totalPages": 30
}
```

---

#### GET /quality/records/:id
Dettagli singolo record.

**Response:** `200 OK`

---

#### POST /quality/records
Crea nuovo record controllo qualità.

**Request:**
```json
{
  "cartellino": "CART001",
  "commessa": "COM123",
  "articolo": "ART456",
  "quantita": 50,
  "departmentId": 1,
  "operatorId": 1,
  "defects": [
    {
      "defectTypeId": 1,
      "quantity": 2
    }
  ],
  "note": "Controllato lotto completo"
}
```

**Response:** `201 Created`

---

#### POST /quality/check-cartellino
Verifica esistenza e dati cartellino.

**Request:**
```json
{
  "cartellino": "CART001"
}
```

**Response:** `200 OK`
```json
{
  "exists": true,
  "data": {
    "cartellino": "CART001",
    "commessa": "COM123",
    "articolo": "ART456",
    "quantita": 500,
    "dataInizio": "2025-01-10"
  }
}
```

---

#### POST /quality/check-commessa
Verifica esistenza commessa.

**Request:**
```json
{
  "commessa": "COM123"
}
```

**Response:** `200 OK`
```json
{
  "exists": true,
  "data": {
    "commessa": "COM123",
    "cliente": "Cliente XYZ",
    "articoli": ["ART456", "ART789"]
  }
}
```

---

### Operator Summary

#### GET /quality/operator-summary
Riepilogo controlli operatore per data.

**Query Params:**
- `operatore` (string) - Username operatore
- `date` (date, YYYY-MM-DD)

**Example:** `/quality/operator-summary?operatore=op001&date=2025-01-15`

**Response:** `200 OK`
```json
{
  "operatore": "op001",
  "date": "2025-01-15",
  "totalRecords": 25,
  "totalDefects": 3,
  "defectRate": 12.0,
  "byDefectType": [
    {
      "defectType": "Cucitura irregolare",
      "count": 2
    }
  ]
}
```

---

### Utilities

#### GET /quality/unique-operators
Lista operatori univoci che hanno fatto controlli.

**Response:** `200 OK`
```json
[
  {
    "username": "op001",
    "nome": "Mario Rossi"
  }
]
```

---

#### GET /quality/defect-categories
Lista categorie difetti univoche.

**Response:** `200 OK`
```json
[
  "Cucitura",
  "Accessori",
  "Tessuto",
  "Finishing"
]
```

---

#### GET /quality/options
Opzioni dropdown per form qualità.

**Response:** `200 OK`
```json
{
  "departments": [...],
  "defectTypes": [...],
  "operators": [...],
  "categories": [...]
}
```

---

### Reports

#### GET /quality/reports/statistics
Statistiche report qualità.

**Query Params:**
- `startDate` (date, YYYY-MM-DD)
- `endDate` (date, YYYY-MM-DD)

**Response:** `200 OK`

---

#### POST /quality/reports/generate-pdf
Genera report PDF qualità (job asincrono).

**Request:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "departmentId": 1
}
```

**Response:** `202 Accepted`

---

## Riparazioni Module

Base path: `/api/riparazioni`

**Auth:** JWT Required
**Permissions:** `riparazioni`

### Main Data

#### GET /riparazioni
Lista riparazioni con pagination e filtri.

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `stato` (string, optional) - 'aperta', 'in_lavorazione', 'completata'
- `laboratorio` (number, optional) - ID laboratorio
- `startDate` (date, optional)
- `endDate` (date, optional)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "idRiparazione": "RIP001",
      "cartellino": "CART001",
      "articolo": "ART456",
      "quantita": 50,
      "difetto": "Cucitura da rifare",
      "laboratorioId": 1,
      "laboratorioNome": "Lab Esterno A",
      "repartoId": 1,
      "repartoNome": "Reparto A",
      "stato": "aperta",
      "dataApertura": "2025-01-15T08:00:00.000Z",
      "dataChiusura": null
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

#### GET /riparazioni/stats
Statistiche dashboard riparazioni.

**Response:** `200 OK`
```json
{
  "total": 150,
  "aperte": 45,
  "inLavorazione": 30,
  "completate": 75,
  "byLaboratorio": [
    {
      "laboratorioId": 1,
      "laboratorioNome": "Lab Esterno A",
      "aperte": 15,
      "completate": 25
    }
  ],
  "avgCompletionTime": 3.5
}
```

---

#### GET /riparazioni/next-id
Prossimo ID riparazione disponibile.

**Response:** `200 OK`
```json
{
  "nextId": "RIP152"
}
```

---

#### GET /riparazioni/:id
Dettagli riparazione per ID numerico.

**Path Params:**
- `id` (number) - ID numerico

**Response:** `200 OK`

---

#### GET /riparazioni/id/:idRiparazione
Dettagli riparazione per ID custom.

**Path Params:**
- `idRiparazione` (string) - Es: "RIP001"

**Response:** `200 OK`

---

#### GET /riparazioni/cartellino/:cartellino
Dati cartellino per nuova riparazione.

**Path Params:**
- `cartellino` (string)

**Response:** `200 OK`
```json
{
  "cartellino": "CART001",
  "commessa": "COM123",
  "articolo": "ART456",
  "descrizioneArticolo": "Camicia blu",
  "quantita": 500,
  "dataInizio": "2025-01-10"
}
```

---

#### POST /riparazioni
Crea nuova riparazione.

**Request:**
```json
{
  "idRiparazione": "RIP152",
  "cartellino": "CART001",
  "articolo": "ART456",
  "quantita": 50,
  "difetto": "Cucitura irregolare",
  "laboratorioId": 1,
  "repartoId": 1,
  "lineaId": 1,
  "numerataId": 1,
  "note": "Urgente"
}
```

**Response:** `201 Created`

---

#### PUT /riparazioni/:id/complete
Completa riparazione.

**Path Params:**
- `id` (number) - ID riparazione

**Request:**
```json
{
  "dataChiusura": "2025-01-18T16:00:00.000Z",
  "noteChiusura": "Riparazione completata con successo"
}
```

**Response:** `200 OK`

---

#### PUT /riparazioni/:id
Aggiorna riparazione.

**Request:**
```json
{
  "stato": "in_lavorazione",
  "note": "In lavorazione presso laboratorio"
}
```

**Response:** `200 OK`

---

#### DELETE /riparazioni/:id
Elimina riparazione.

**Response:** `200 OK`

---

### Support Data

#### GET /riparazioni/reparti
Lista reparti.

**Response:** `200 OK`

---

#### GET /riparazioni/laboratori
Lista laboratori esterni.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "nome": "Lab Esterno A",
    "indirizzo": "Via Roma 123",
    "telefono": "0123456789",
    "email": "lab@example.com",
    "attivo": true
  }
]
```

---

#### GET /riparazioni/linee
Lista linee produzione.

**Response:** `200 OK`

---

#### GET /riparazioni/numerate
Lista ID numerata disponibili.

**Response:** `200 OK`

---

#### GET /riparazioni/numerate/:id
Singolo ID numerata.

**Response:** `200 OK`

---

### CRUD Support Tables

#### POST /riparazioni/laboratori
Crea laboratorio.

**Request:**
```json
{
  "nome": "Lab Esterno B",
  "indirizzo": "Via Milano 456",
  "telefono": "0987654321",
  "email": "labb@example.com",
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /riparazioni/laboratori/:id
Aggiorna laboratorio.

**Response:** `200 OK`

---

#### DELETE /riparazioni/laboratori/:id
Elimina laboratorio.

**Response:** `200 OK`

---

#### POST /riparazioni/reparti
Crea reparto.

**Response:** `201 Created`

---

#### PUT /riparazioni/reparti/:id
Aggiorna reparto.

**Response:** `200 OK`

---

#### DELETE /riparazioni/reparti/:id
Elimina reparto.

**Response:** `200 OK`

---

#### POST /riparazioni/numerate
Crea ID numerata.

**Response:** `201 Created`

---

#### PUT /riparazioni/numerate/:id
Aggiorna ID numerata.

**Response:** `200 OK`

---

#### DELETE /riparazioni/numerate/:id
Elimina ID numerata.

**Response:** `200 OK`

---

## SCM Module

Base path: `/api/scm`

**Auth:** JWT Required
**Permissions:** `scm_admin`

### Statistics

#### GET /scm/statistics
Statistiche SCM.

**Response:** `200 OK`
```json
{
  "totalLaunches": 250,
  "activeLaunches": 85,
  "completedLaunches": 165,
  "totalArticles": 1500,
  "avgArticlesPerLaunch": 6,
  "avgCompletionTime": 15.5
}
```

---

### Laboratories

#### GET /scm/laboratories
Lista laboratori SCM.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "nome": "Laboratorio Principale",
    "descrizione": "Lab interno produzione",
    "attivo": true
  }
]
```

---

#### GET /scm/laboratories/:id
Singolo laboratorio.

**Response:** `200 OK`

---

#### POST /scm/laboratories
Crea laboratorio.

**Request:**
```json
{
  "nome": "Laboratorio Secondario",
  "descrizione": "Lab esterno",
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /scm/laboratories/:id
Aggiorna laboratorio.

**Response:** `200 OK`

---

#### DELETE /scm/laboratories/:id
Elimina laboratorio.

**Response:** `200 OK`

---

### Launches

#### GET /scm/launches
Lista lanci con filtri.

**Query Params:**
- `stato` (string, optional) - 'pending', 'in_progress', 'completed', 'blocked'
- `startDate` (date, optional)
- `endDate` (date, optional)
- `limit` (number, optional)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "codice": "LAN001",
      "descrizione": "Lancio Collezione Primavera",
      "laboratorioId": 1,
      "laboratorioNome": "Laboratorio Principale",
      "stato": "in_progress",
      "dataInizio": "2025-01-10",
      "dataFinePrevista": "2025-02-10",
      "dataFineEffettiva": null,
      "articlesCount": 15,
      "completedArticles": 8,
      "progress": 53.3
    }
  ],
  "total": 250
}
```

---

#### GET /scm/launches/:id
Dettagli lancio completo con articoli e fasi.

**Response:** `200 OK`
```json
{
  "id": 1,
  "codice": "LAN001",
  "descrizione": "Lancio Collezione Primavera",
  "laboratorioId": 1,
  "stato": "in_progress",
  "dataInizio": "2025-01-10",
  "dataFinePrevista": "2025-02-10",
  "articles": [
    {
      "id": 1,
      "articolo": "ART001",
      "descrizione": "Camicia bianca",
      "quantita": 500,
      "stato": "in_progress",
      "phases": [
        {
          "id": 1,
          "standardPhaseId": 1,
          "phaseName": "Taglio",
          "ordine": 1,
          "stato": "completed",
          "dataInizio": "2025-01-10",
          "dataFine": "2025-01-12",
          "progress": [
            {
              "id": 1,
              "data": "2025-01-11",
              "quantita": 250,
              "note": "Prima metà completata"
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### POST /scm/launches
Crea nuovo lancio.

**Request:**
```json
{
  "codice": "LAN002",
  "descrizione": "Lancio Estate 2025",
  "laboratorioId": 1,
  "dataInizio": "2025-02-01",
  "dataFinePrevista": "2025-03-15"
}
```

**Response:** `201 Created`

---

#### PUT /scm/launches/:id
Aggiorna lancio.

**Request:**
```json
{
  "descrizione": "Lancio Estate 2025 - Aggiornato",
  "stato": "in_progress",
  "dataFinePrevista": "2025-03-20"
}
```

**Response:** `200 OK`

---

#### DELETE /scm/launches/:id
Elimina lancio.

**Response:** `200 OK`

---

### Launch Articles

#### POST /scm/launches/:launchId/articles
Aggiunge articolo a lancio.

**Path Params:**
- `launchId` (number)

**Request:**
```json
{
  "articolo": "ART002",
  "descrizione": "Pantalone blu",
  "quantita": 300,
  "standardPhases": [1, 2, 3]
}
```

**Response:** `201 Created`

**Nota:** `standardPhases` è array di ID fasi standard da applicare automaticamente.

---

#### PUT /scm/articles/:id
Aggiorna articolo lancio.

**Path Params:**
- `id` (number) - ID articolo

**Request:**
```json
{
  "quantita": 350,
  "stato": "in_progress"
}
```

**Response:** `200 OK`

---

#### DELETE /scm/articles/:id
Elimina articolo da lancio.

**Response:** `200 OK`

---

### Article Phases

#### PUT /scm/phases/:id
Aggiorna fase articolo.

**Path Params:**
- `id` (number) - ID fase

**Request:**
```json
{
  "stato": "completed",
  "dataInizio": "2025-01-10",
  "dataFine": "2025-01-12",
  "note": "Completata senza problemi"
}
```

**Response:** `200 OK`

---

### Progress Tracking

#### POST /scm/phases/:phaseId/progress
Aggiunge record progresso a fase.

**Path Params:**
- `phaseId` (number)

**Request:**
```json
{
  "data": "2025-01-11",
  "quantita": 150,
  "note": "Produzione giornaliera"
}
```

**Response:** `201 Created`

---

#### GET /scm/phases/:phaseId/progress
Recupera progressi fase.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "data": "2025-01-11",
    "quantita": 150,
    "note": "Produzione giornaliera",
    "createdAt": "2025-01-11T18:00:00.000Z"
  }
]
```

---

### Standard Phases

#### GET /scm/standard-phases
Lista fasi standard.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "nome": "Taglio",
    "descrizione": "Fase di taglio tessuto",
    "ordine": 1,
    "durataStimataGiorni": 2,
    "attivo": true
  }
]
```

---

#### GET /scm/standard-phases/:id
Singola fase standard.

**Response:** `200 OK`

---

#### POST /scm/standard-phases
Crea fase standard.

**Request:**
```json
{
  "nome": "Controllo Qualità",
  "descrizione": "Controllo qualità finale",
  "ordine": 10,
  "durataStimataGiorni": 1,
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /scm/standard-phases/:id
Aggiorna fase standard.

**Response:** `200 OK`

---

#### DELETE /scm/standard-phases/:id
Elimina fase standard.

**Response:** `200 OK`

---

### Settings

#### GET /scm/settings
Recupera tutte le impostazioni SCM.

**Response:** `200 OK`
```json
{
  "autoNotifyDelay": true,
  "notifyDelayDays": 3,
  "autoBlockOnCritical": true,
  "defaultLaboratory": 1
}
```

---

#### GET /scm/settings/:key
Recupera singola impostazione.

**Path Params:**
- `key` (string) - Chiave impostazione

**Response:** `200 OK`
```json
{
  "key": "autoNotifyDelay",
  "value": true
}
```

---

#### PUT /scm/settings/:key
Aggiorna singola impostazione.

**Request:**
```json
{
  "value": false
}
```

**Response:** `200 OK`

---

#### POST /scm/settings/batch
Aggiorna multiple impostazioni.

**Request:**
```json
{
  "autoNotifyDelay": true,
  "notifyDelayDays": 5,
  "autoBlockOnCritical": false
}
```

**Response:** `200 OK`

---

## Export Module

Base path: `/api/export`

**Auth:** JWT Required
**Permissions:** `export`

### Articles Master

#### GET /export/articles-master
Lista articoli master.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "codice": "ART001",
    "descrizione": "Camicia bianca",
    "um": "PZ",
    "prezzo": 45.50,
    "attivo": true
  }
]
```

---

#### GET /export/articles-master/:id
Singolo articolo master per ID.

**Response:** `200 OK`

---

#### GET /export/articles-master/by-code/:code
Singolo articolo master per codice.

**Path Params:**
- `code` (string) - Codice articolo

**Response:** `200 OK`

---

#### POST /export/articles-master
Crea articolo master.

**Request:**
```json
{
  "codice": "ART002",
  "descrizione": "Pantalone blu",
  "um": "PZ",
  "prezzo": 65.00,
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /export/articles-master/:id
Aggiorna articolo master.

**Response:** `200 OK`

---

#### DELETE /export/articles-master/:id
Elimina articolo master.

**Response:** `200 OK`

---

### Terzisti (Third-party services)

#### GET /export/terzisti
Lista terzisti.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "codice": "TERZ001",
    "ragioneSociale": "Laboratorio Esterno SRL",
    "indirizzo": "Via Roma 123",
    "citta": "Milano",
    "provincia": "MI",
    "cap": "20100",
    "telefono": "0212345678",
    "email": "info@labest.com",
    "attivo": true
  }
]
```

---

#### GET /export/terzisti/:id
Singolo terzista.

**Response:** `200 OK`

---

#### POST /export/terzisti
Crea terzista.

**Request:**
```json
{
  "codice": "TERZ002",
  "ragioneSociale": "Lavorazioni XYZ SNC",
  "indirizzo": "Via Milano 456",
  "citta": "Torino",
  "provincia": "TO",
  "cap": "10100",
  "telefono": "0119876543",
  "email": "xyz@example.com",
  "attivo": true
}
```

**Response:** `201 Created`

---

#### PUT /export/terzisti/:id
Aggiorna terzista.

**Response:** `200 OK`

---

#### DELETE /export/terzisti/:id
Elimina terzista.

**Response:** `200 OK`

---

### Documents (DDT - Delivery notes)

#### GET /export/documents
Lista documenti con filtri.

**Query Params:**
- `stato` (string, optional) - 'aperto', 'chiuso'
- `terzistaId` (number, optional)
- `startDate` (date, optional)
- `endDate` (date, optional)
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "progressivo": 1,
      "numeroDocumento": "DDT001/2025",
      "data": "2025-01-15",
      "terzistaId": 1,
      "terzistaNome": "Laboratorio Esterno SRL",
      "stato": "aperto",
      "totalItems": 5,
      "totalQuantita": 1250,
      "createdAt": "2025-01-15T08:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

#### GET /export/documents/next-progressivo
Prossimo numero progressivo documento.

**Response:** `200 OK`
```json
{
  "nextProgressivo": 152
}
```

---

#### GET /export/documents/:progressivo
Dettagli documento completo con righe.

**Path Params:**
- `progressivo` (number)

**Response:** `200 OK`
```json
{
  "progressivo": 1,
  "numeroDocumento": "DDT001/2025",
  "data": "2025-01-15",
  "terzistaId": 1,
  "terzista": {
    "id": 1,
    "ragioneSociale": "Laboratorio Esterno SRL",
    "indirizzo": "Via Roma 123"
  },
  "stato": "aperto",
  "items": [
    {
      "id": 1,
      "riga": 1,
      "articoloId": 1,
      "articolo": "ART001",
      "descrizione": "Camicia bianca",
      "quantita": 250,
      "um": "PZ",
      "prezzo": 45.50
    }
  ],
  "footer": {
    "note": "Consegna urgente",
    "trasportoCura": "mittente",
    "causaleTrasporto": "vendita"
  },
  "missingData": [...],
  "launchData": [...]
}
```

---

#### POST /export/documents
Crea nuovo documento.

**Request:**
```json
{
  "numeroDocumento": "DDT002/2025",
  "data": "2025-01-16",
  "terzistaId": 1
}
```

**Response:** `201 Created`

---

#### PUT /export/documents/:progressivo
Aggiorna documento.

**Request:**
```json
{
  "data": "2025-01-17",
  "note": "Data consegna modificata"
}
```

**Response:** `200 OK`

---

#### DELETE /export/documents/:progressivo
Elimina documento (solo se aperto).

**Response:** `200 OK`

---

#### POST /export/documents/:progressivo/close
Chiude documento.

**Path Params:**
- `progressivo` (number)

**Request:**
```json
{
  "dataChiusura": "2025-01-20T16:00:00.000Z"
}
```

**Response:** `200 OK`

---

#### POST /export/documents/:progressivo/reopen
Riapre documento chiuso.

**Response:** `200 OK`

---

### Document Items (Righe DDT)

#### POST /export/document-items
Aggiunge riga a documento.

**Request:**
```json
{
  "progressivo": 1,
  "riga": 2,
  "articoloId": 2,
  "quantita": 150,
  "prezzo": 65.00
}
```

**Response:** `201 Created`

---

#### PUT /export/document-items/:id
Aggiorna riga documento.

**Path Params:**
- `id` (number) - ID riga

**Request:**
```json
{
  "quantita": 200,
  "prezzo": 60.00
}
```

**Response:** `200 OK`

---

#### DELETE /export/document-items/:id
Elimina riga documento.

**Response:** `200 OK`

---

### Document Footer (Piede documento)

#### POST /export/document-footer
Crea/aggiorna piede documento.

**Request:**
```json
{
  "progressivo": 1,
  "note": "Consegna entro 5 giorni",
  "trasportoCura": "mittente",
  "causaleTrasporto": "vendita",
  "aspettoEsteriore": "scatole",
  "numeroColli": 10,
  "peso": 125.5
}
```

**Response:** `200 OK`

---

#### GET /export/document-footer/:documentoId
Recupera piede documento.

**Path Params:**
- `documentoId` (number) - Progressivo documento

**Response:** `200 OK`

---

### Missing Data (Mancanti)

#### POST /export/missing-data
Aggiunge articolo mancante.

**Request:**
```json
{
  "progressivo": 1,
  "articoloId": 3,
  "quantita": 50,
  "note": "Da consegnare successivamente"
}
```

**Response:** `201 Created`

---

#### GET /export/missing-data/:documentoId
Lista mancanti per documento.

**Path Params:**
- `documentoId` (number)

**Response:** `200 OK`

---

#### GET /export/missing-data-from-closed/:terzistaId
Recupera mancanti da documenti chiusi per terzista.

**Path Params:**
- `terzistaId` (number)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "progressivo": 5,
    "numeroDocumento": "DDT005/2025",
    "articoloId": 3,
    "articolo": "ART003",
    "quantita": 50,
    "note": "Da consegnare"
  }
]
```

---

#### DELETE /export/missing-data/:id
Elimina mancante.

**Response:** `200 OK`

---

### Launch Data (Lanci)

#### POST /export/launch-data
Associa lancio a documento.

**Request:**
```json
{
  "progressivo": 1,
  "launchId": 10,
  "note": "Lancio collezione estate"
}
```

**Response:** `201 Created`

---

#### GET /export/launch-data/:documentoId
Lista lanci associati a documento.

**Path Params:**
- `documentoId` (number)

**Response:** `200 OK`

---

#### DELETE /export/launch-data/:id
Rimuove associazione lancio.

**Response:** `200 OK`

---

### Excel Processing

#### POST /export/documents/:progressivo/upload-excel
Upload file Excel per documento.

**Content-Type:** `multipart/form-data`

**Path Params:**
- `progressivo` (number)

**Form Data:**
- `file` (file) - File Excel (.xlsx)

**Response:** `200 OK`
```json
{
  "fileName": "document_1_20250115_143000.xlsx",
  "uploadedAt": "2025-01-15T14:30:00.000Z"
}
```

---

#### GET /export/documents/:progressivo/uploaded-files
Lista file Excel caricati per documento.

**Response:** `200 OK`
```json
[
  {
    "fileName": "document_1_20250115_143000.xlsx",
    "uploadedAt": "2025-01-15T14:30:00.000Z",
    "size": 45678
  }
]
```

---

#### POST /export/documents/:progressivo/process-excel
Processa file Excel e estrae dati.

**Request:**
```json
{
  "fileName": "document_1_20250115_143000.xlsx"
}
```

**Response:** `200 OK`
```json
{
  "rows": 150,
  "data": [
    {
      "articolo": "ART001",
      "descrizione": "Camicia bianca",
      "quantita": 250,
      "prezzo": 45.50
    }
  ]
}
```

---

#### DELETE /export/documents/:progressivo/uploaded-files/:fileName
Elimina file Excel caricato.

**Path Params:**
- `progressivo` (number)
- `fileName` (string)

**Response:** `200 OK`

---

#### POST /export/documents/:progressivo/save-excel-data
Salva dati da Excel come righe documento.

**Request:**
```json
{
  "data": [
    {
      "articolo": "ART001",
      "quantita": 250,
      "prezzo": 45.50
    }
  ]
}
```

**Response:** `200 OK`

---

#### POST /export/documents/:progressivo/generate-ddt
Genera DDT PDF da documento (job asincrono).

**Path Params:**
- `progressivo` (number)

**Response:** `202 Accepted`
```json
{
  "jobId": "job_987654321",
  "status": "pending"
}
```

---

## Tracking Module

Base path: `/api/tracking`

**Auth:** JWT Required
**Permissions:** `tracking`

### Dashboard

#### GET /tracking/stats
Statistiche dashboard tracking.

**Response:** `200 OK`
```json
{
  "totalLinks": 5000,
  "totalLots": 3500,
  "totalOrders": 2500,
  "lotsWithDDT": 2800,
  "lotsWithoutDDT": 700,
  "ordersWithDate": 2200,
  "ordersWithoutDate": 300
}
```

---

### Types

#### GET /tracking/types
Lista tipi tracking.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "nome": "Lotto Produzione",
    "descrizione": "Tracking lotti produzione"
  }
]
```

---

#### POST /tracking/types
Crea tipo tracking.

**Request:**
```json
{
  "nome": "Lotto QC",
  "descrizione": "Tracking controllo qualità"
}
```

**Response:** `201 Created`

---

### Multisearch

#### POST /tracking/search-data
Ricerca multipla per lotto, cartellino, ordine.

**Request:**
```json
{
  "searchType": "lotto",
  "searchValue": "LOT12345"
}
```

**searchType values:** `"lotto"`, `"cartellino"`, `"ordine"`

**Response:** `200 OK`
```json
{
  "searchType": "lotto",
  "searchValue": "LOT12345",
  "results": [
    {
      "id": 1,
      "lotto": "LOT12345",
      "cartellino": "CART001",
      "ordine": "ORD500",
      "articolo": "ART001",
      "quantita": 250,
      "dataProduzione": "2025-01-10",
      "ddt": "DDT005/2025"
    }
  ]
}
```

---

### Order Search

#### POST /tracking/check-cartel
Verifica cartellino per tracking.

**Request:**
```json
{
  "cartellino": "CART001"
}
```

**Response:** `200 OK`
```json
{
  "exists": true,
  "data": {
    "cartellino": "CART001",
    "ordine": "ORD500",
    "articolo": "ART001",
    "quantita": 500,
    "dataInizio": "2025-01-10"
  }
}
```

---

### Process Links

#### POST /tracking/save-links
Salva link lotto-cartellino.

**Request:**
```json
{
  "links": [
    {
      "lotto": "LOT12345",
      "cartellino": "CART001",
      "quantita": 250,
      "note": "Prima parte"
    },
    {
      "lotto": "LOT12346",
      "cartellino": "CART001",
      "quantita": 250,
      "note": "Seconda parte"
    }
  ]
}
```

**Response:** `201 Created`

---

#### POST /tracking/generate-links-pdf
Genera report PDF link (job asincrono).

**Request:**
```json
{
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
}
```

**Response:** `202 Accepted`

---

### Tree View

#### GET /tracking/tree-data
Dati tree view con pagination.

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 100)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "lotto": "LOT12345",
      "cartellino": "CART001",
      "ordine": "ORD500",
      "articolo": "ART001",
      "quantita": 250,
      "lotInfo": {
        "documento": "DDT005/2025",
        "dataDocumento": "2025-01-15",
        "note": "Spedito"
      },
      "orderInfo": {
        "cliente": "Cliente XYZ",
        "dataConsegna": "2025-01-20"
      },
      "articleInfo": {
        "sku": "SKU-ART001-WH-M",
        "descrizione": "Camicia bianca M"
      }
    }
  ],
  "total": 5000,
  "page": 1,
  "limit": 100,
  "totalPages": 50
}
```

---

### Lot Updates

#### PUT /tracking/update-lot/:id
Aggiorna lotto.

**Path Params:**
- `id` (number) - ID link

**Request:**
```json
{
  "quantita": 300,
  "note": "Quantità aggiornata"
}
```

**Response:** `200 OK`

---

#### DELETE /tracking/delete-lot/:id
Elimina link lotto.

**Response:** `200 OK`

---

### Lot Details (3 tab queries)

#### GET /tracking/lots-without-ddt
Lotti senza DDT.

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 50)

**Response:** `200 OK`

---

#### GET /tracking/lots-with-ddt
Lotti con DDT.

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 50)

**Response:** `200 OK`

---

#### GET /tracking/orders-without-date
Ordini senza data consegna.

**Response:** `200 OK`

---

#### GET /tracking/orders-with-date
Ordini con data consegna.

**Response:** `200 OK`

---

#### GET /tracking/articles-without-sku
Articoli senza SKU.

**Response:** `200 OK`

---

#### GET /tracking/articles-with-sku
Articoli con SKU.

**Response:** `200 OK`

---

### Detail Updaters

#### POST /tracking/update-lot-info
Aggiorna info lotto (documento, date, note).

**Request:**
```json
{
  "lotto": "LOT12345",
  "documento": "DDT005/2025",
  "dataDocumento": "2025-01-15",
  "note": "Spedito con corriere"
}
```

**Response:** `200 OK`

---

#### POST /tracking/update-order-info
Aggiorna info ordine.

**Request:**
```json
{
  "ordine": "ORD500",
  "cliente": "Cliente XYZ",
  "dataConsegna": "2025-01-20",
  "note": "Urgente"
}
```

**Response:** `200 OK`

---

#### POST /tracking/update-sku
Aggiorna SKU articolo.

**Request:**
```json
{
  "articolo": "ART001",
  "sku": "SKU-ART001-WH-M",
  "descrizione": "Camicia bianca M"
}
```

**Response:** `200 OK`

---

### Search Details

#### GET /tracking/search-lot-details
Cerca dettagli lotto.

**Query Params:**
- `lot` (string) - Codice lotto

**Example:** `/tracking/search-lot-details?lot=LOT12345`

**Response:** `200 OK`
```json
{
  "lotto": "LOT12345",
  "documento": "DDT005/2025",
  "dataDocumento": "2025-01-15",
  "cartellini": ["CART001", "CART002"],
  "quantitaTotale": 500,
  "note": "Spedito"
}
```

---

#### GET /tracking/search-order-details
Cerca dettagli ordine.

**Query Params:**
- `ordine` (string) - Numero ordine

**Response:** `200 OK`

---

#### GET /tracking/search-articolo-details
Cerca dettagli articolo.

**Query Params:**
- `art` (string) - Codice articolo

**Response:** `200 OK`

---

### Reports

#### POST /tracking/load-summary
Carica riepilogo per report.

**Request:**
```json
{
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "lotto": "LOT12345"
  }
}
```

**Response:** `200 OK`

---

#### POST /tracking/report-lot-pdf
Genera report lotti PDF (job asincrono).

**Request:**
```json
{
  "lotto": "LOT12345"
}
```

**Response:** `202 Accepted`

---

#### POST /tracking/report-cartel-pdf
Genera report cartellini PDF (job asincrono).

**Request:**
```json
{
  "cartellino": "CART001"
}
```

**Response:** `202 Accepted`

---

#### POST /tracking/report-lot-excel
Genera report lotti Excel (job asincrono).

**Response:** `202 Accepted`

---

#### POST /tracking/report-cartel-excel
Genera report cartellini Excel (job asincrono).

**Response:** `202 Accepted`

---

#### POST /tracking/report-fiches-pdf
Genera report fiches PDF (job asincrono).

**Response:** `202 Accepted`

---

## Jobs Module

Base path: `/api/jobs`

**Auth:** JWT Required

### Job Management

#### POST /jobs
Enqueue nuovo job asincrono.

**Request:**
```json
{
  "type": "prod.report-pdf",
  "payload": {
    "date": "2025-01-15"
  },
  "priority": 1
}
```

**Job Types:**
- `prod.report-pdf` - PDF produzione
- `prod.csv-report-pdf` - PDF da CSV produzione
- `quality.report-pdf` - PDF qualità
- `track.links-report-pdf` - PDF link tracking
- `track.report-lot-pdf` - PDF lotti
- `track.report-cartel-pdf` - PDF cartellini
- `track.report-lot-excel` - Excel lotti
- `track.report-cartel-excel` - Excel cartellini
- `track.report-fiches-pdf` - PDF fiches

**Response:** `201 Created`
```json
{
  "jobId": "job_123456789",
  "type": "prod.report-pdf",
  "status": "pending",
  "createdAt": "2025-01-15T14:30:00.000Z"
}
```

---

#### GET /jobs
Lista job dell'utente corrente.

**Query Params:**
- `status` (string, optional) - 'pending', 'processing', 'done', 'failed'
- `type` (string, optional) - Filtra per tipo job
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "job_123456789",
      "type": "prod.report-pdf",
      "status": "done",
      "payload": {
        "date": "2025-01-15"
      },
      "result": {
        "fileId": 1,
        "fileName": "report_20250115.pdf",
        "fileSize": 125678
      },
      "error": null,
      "createdAt": "2025-01-15T14:30:00.000Z",
      "startedAt": "2025-01-15T14:30:05.000Z",
      "completedAt": "2025-01-15T14:30:25.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

#### GET /jobs/:id
Dettagli job specifico.

**Path Params:**
- `id` (string) - Job ID

**Response:** `200 OK`
```json
{
  "id": "job_123456789",
  "type": "prod.report-pdf",
  "status": "done",
  "payload": {
    "date": "2025-01-15"
  },
  "result": {
    "fileId": 1,
    "fileName": "report_20250115.pdf",
    "downloadUrl": "/api/jobs/job_123456789/download"
  },
  "progress": 100,
  "createdAt": "2025-01-15T14:30:00.000Z",
  "completedAt": "2025-01-15T14:30:25.000Z"
}
```

---

#### GET /jobs/:id/download
Download file risultato job.

**Path Params:**
- `id` (string) - Job ID

**Response:** `200 OK` (file binary)

**Headers:**
- `Content-Type`: application/pdf (o altro)
- `Content-Disposition`: attachment; filename="report.pdf"

---

#### DELETE /jobs/:id
Elimina job (solo se completato o fallito).

**Response:** `200 OK`

---

### Utilities

#### POST /jobs/merge-pdf
Merge multipli PDF in uno solo (job asincrono).

**Request:**
```json
{
  "fileIds": [1, 2, 3],
  "outputFileName": "merged_report.pdf"
}
```

**Response:** `202 Accepted`

---

#### POST /jobs/zip
Crea file ZIP da multipli file (job asincrono).

**Request:**
```json
{
  "fileIds": [1, 2, 3, 4],
  "zipFileName": "documents.zip"
}
```

**Response:** `202 Accepted`

---

## File Manager Module

Base path: `/api/files`

**Auth:** JWT Required

### File Management

#### GET /files
Lista file con filtri e pagination.

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `mimeType` (string, optional) - Es: 'application/pdf'
- `uploadedBy` (number, optional) - User ID
- `startDate` (date, optional)
- `endDate` (date, optional)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "fileName": "report_20250115.pdf",
      "originalName": "Produzione_15_gennaio.pdf",
      "mimeType": "application/pdf",
      "size": 125678,
      "path": "reports/2025/01/report_20250115.pdf",
      "uploadedBy": 1,
      "uploadedByName": "Mario Rossi",
      "createdAt": "2025-01-15T14:30:25.000Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 50,
  "totalPages": 10
}
```

---

#### GET /files/stats
Statistiche file storage.

**Response:** `200 OK`
```json
{
  "totalFiles": 500,
  "totalSize": 52428800,
  "totalSizeFormatted": "50.00 MB",
  "byMimeType": {
    "application/pdf": 350,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 100,
    "image/png": 50
  },
  "byMonth": {
    "2025-01": 150,
    "2024-12": 200
  }
}
```

---

#### GET /files/:id/download
Genera URL download per file.

**Path Params:**
- `id` (number) - File ID

**Response:** `200 OK`
```json
{
  "downloadUrl": "https://minio-host/coregre/reports/2025/01/report_20250115.pdf?X-Amz-Algorithm=...",
  "expiresIn": 3600
}
```

**Nota:** URL è temporaneo (expires in 1 ora).

---

#### DELETE /files/:id
Elimina file.

**Path Params:**
- `id` (number)

**Response:** `200 OK`

---

#### DELETE /files
Cancellazione multipla file.

**Request:**
```json
{
  "ids": [1, 2, 3, 4]
}
```

**Response:** `200 OK`

---

#### GET /files/sync/minio
Sincronizza database file con MinIO storage.

**Response:** `200 OK`
```json
{
  "syncedFiles": 25,
  "removedFiles": 3,
  "addedFiles": 10
}
```

---

## Mobile Module

Base path: `/api/mobile`

**Auth:** JWT Required

Il modulo mobile contiene API dedicate per l'app mobile con 4 controller specializzati:

### Controllers

1. **discovery.controller.ts** - Service discovery per app mobile
2. **mobile-api.controller.ts** - API generiche mobile
3. **operators.controller.ts** - Operazioni operatori mobile
4. **quality-api.controller.ts** - API qualità per mobile

**Nota:** Le API mobile sono ottimizzate per dispositivi mobili con payload ridotti e response formattate per UI mobile.

---

## Other Modules

### Health Module

#### GET /api/health
Health check completo sistema (no auth required).

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "uptime": 123456,
  "services": {
    "database": "ok",
    "redis": "ok",
    "minio": "ok",
    "meilisearch": "ok"
  }
}
```

---

### Activity Log Module

#### GET /api/activity-log
Log attività utenti.

**Auth:** JWT Required
**Permissions:** `admin`

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `userId` (number, optional)
- `module` (string, optional)
- `action` (string, optional)
- `startDate` (date, optional)
- `endDate` (date, optional)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "userId": 1,
      "username": "admin",
      "module": "produzione",
      "action": "create",
      "entity": "ProductionPhase",
      "entityId": 5,
      "description": "Creata fase 'Stiro'",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-01-15T14:30:00.000Z"
    }
  ],
  "total": 5000,
  "page": 1,
  "limit": 50,
  "totalPages": 100
}
```

---

### Settings Module

#### GET /api/settings
Recupera impostazioni sistema.

**Auth:** JWT Required
**Permissions:** `admin`

**Response:** `200 OK`
```json
{
  "module": {
    "produzione": {
      "enabled": true
    },
    "qualita": {
      "enabled": true
    }
  },
  "system": {
    "companyName": "CoreGRE SRL",
    "timezone": "Europe/Rome"
  }
}
```

---

### Notifications Module

Base path: `/api/notifications`

**Auth:** JWT Required

Gestione notifiche in-app per utenti.

---

### Widgets Module

Base path: `/api/widgets`

**Auth:** JWT Required

Fornisce dati per widget dashboard personalizzabili.

---

### Search Module

Base path: `/api/search`

**Auth:** JWT Required

Ricerca full-text globale attraverso MeiliSearch.

---

## Job Queue System

### Overview

Il sistema utilizza **BullMQ** (Redis-based) per gestire operazioni asincrone pesanti come:
- Generazione PDF/Excel
- Invio email
- Processamento batch
- Report complessi

### Job Flow

1. **Enqueue**: Client POST `/api/jobs` con type e payload
2. **Processing**: Worker processa job in background
3. **Completion**: Worker salva risultato (file) e aggiorna stato
4. **Download**: Client GET `/api/jobs/:id/download`

### Job Status

- `pending` - In coda
- `processing` - In esecuzione
- `done` - Completato con successo
- `failed` - Fallito (con error message)

### Monitoring

```http
GET /api/jobs?status=processing
```

Monitora job in esecuzione in real-time.

---

## File Upload & Storage

### MinIO Storage

Il backend utilizza **MinIO** (S3-compatible) per lo storage dei file:

**Bucket:** `coregre`

**Struttura:**
```
coregre/
├── reports/
│   ├── produzione/
│   ├── quality/
│   └── tracking/
├── uploads/
│   ├── excel/
│   └── csv/
└── temp/
```

### Upload Flow

1. Client upload file (multipart/form-data)
2. Backend valida file (size, type)
3. File salvato su MinIO con path univoco
4. Record creato in `files` table
5. Response con file ID

### Download Flow

1. Client richiede download: GET `/api/files/:id/download`
2. Backend genera **pre-signed URL** MinIO (1 ora expiry)
3. Client usa URL per download diretto da MinIO

### File Tracking

Tutti i file sono tracciati in `files` table con:
- ID univoco
- Nome originale
- MIME type
- Size
- Path MinIO
- User uploader
- Timestamp

---

## Best Practices

### API Requests

1. **Sempre includere JWT token** (eccetto login e health check)
2. **Validare input lato client** prima di inviare
3. **Gestire errori 401/403** con redirect a login
4. **Implementare retry logic** per errori 5xx temporanei
5. **Usare pagination** per liste grandi (default limit: 20-50)

### Performance

1. **Usare job asincroni** per operazioni pesanti (PDF, Excel)
2. **Implementare caching** lato client per dati statici
3. **Paginare sempre** richieste con potenzialmente molti risultati
4. **Usare filtri** per ridurre payload response

### Security

1. **Mai esporre JWT** in URL o logs
2. **Validare permissions** lato client per UX
3. **Sanitizzare input** prima di inviare
4. **Non inviare password** in chiaro (sempre HTTPS)

---

## Appendix

### Common Query Parameters

| Param | Type | Description | Default |
|-------|------|-------------|---------|
| `page` | number | Numero pagina | 1 |
| `limit` | number | Risultati per pagina | 20 |
| `startDate` | date | Data inizio filtro (YYYY-MM-DD) | - |
| `endDate` | date | Data fine filtro (YYYY-MM-DD) | - |
| `search` | string | Ricerca full-text | - |

### Common Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | number | HTTP status code |
| `message` | string/array | Messaggio response |
| `data` | object | Payload dati |
| `timestamp` | string | ISO 8601 timestamp |
| `error` | string | Nome errore (se errore) |

### Date Formats

- **Date only**: `YYYY-MM-DD` (Es: `2025-01-15`)
- **DateTime**: `YYYY-MM-DDTHH:mm:ss.sssZ` (ISO 8601, Es: `2025-01-15T14:30:00.000Z`)

### Pagination Example

```javascript
// Request
GET /api/produzione/calendar?month=1&year=2025&page=1&limit=20

// Response
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}

// Next page
GET /api/produzione/calendar?month=1&year=2025&page=2&limit=20
```

---

## Support & Contact

Per supporto tecnico o domande su questa API:

- **Repository**: CoreGREJS Backend
- **Version**: 1.0.0
- **Last Updated**: 2025-01-15

---

**END OF DOCUMENTATION**
