# CoreGREJS

Sistema ERP per la gestione della produzione calzaturiera — riscrittura moderna in TypeScript/Node.js del precedente sistema CoreGRE (PHP).

---

## Indice

- [Panoramica](#panoramica)
- [Stack Tecnologico](#stack-tecnologico)
- [Struttura del Progetto](#struttura-del-progetto)
- [Moduli](#moduli)
- [Database](#database)
- [Sistema Job Asincroni](#sistema-job-asincroni)
- [Autenticazione e Permessi](#autenticazione-e-permessi)
- [Installazione](#installazione)
- [Variabili di Ambiente](#variabili-di-ambiente)
- [Comandi Utili](#comandi-utili)
- [Convenzioni](#convenzioni)

---

## Panoramica

CoreGREJS copre l'intera operatività di un'azienda calzaturiera: dalla tracciabilità dei cartellini di produzione all'emissione dei DDT, dal controllo qualità alla gestione delle riparazioni e dei lanci a laboratori esterni. Tutto in un'unica dashboard web con generazione di PDF e Excel via job queue asincrona.

**Componenti principali:**

| App | Porta | Descrizione |
|-----|-------|-------------|
| `apps/backend` | `3011` | API REST NestJS |
| `apps/frontend` | `3010` | Dashboard web Next.js |
| `apps/mobile` | `3012` | PWA operatori Next.js |

---

## Stack Tecnologico

### Backend
| Tecnologia | Versione | Uso |
|-----------|----------|-----|
| NestJS | 10.x | Framework API REST |
| TypeScript | 5.3 | Linguaggio |
| Prisma ORM | 5.22 | Database access |
| MySQL | 8.0 | Database |
| BullMQ | 5.7 | Job queue asincrona |
| Redis | 7.0 | Backend BullMQ + cache |
| PDFKit | 0.15 | Generazione PDF |
| ExcelJS | 4.4 | Generazione Excel |
| MinIO | 8.0 | Object storage (S3-compatible) |
| Passport/JWT | — | Autenticazione |
| Swagger | 7.3 | Documentazione API |

### Frontend
| Tecnologia | Versione | Uso |
|-----------|----------|-----|
| Next.js | 14.2 | Framework (App Router) |
| React | 18.3 | UI |
| TypeScript | 5.x | Linguaggio |
| Tailwind CSS | 4.1 | Styling |
| Framer Motion | 12.x | Animazioni |
| Zustand | 4.5 | State management |
| Axios | 1.6 | HTTP client |
| Recharts | 2.12 | Grafici |
| React Hook Form | 7.51 | Form handling |

---

## Struttura del Progetto

```
CoreGREJS/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── modules/           # Feature modules (NestJS)
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── produzione/
│   │   │   │   ├── tracking/
│   │   │   │   ├── riparazioni/
│   │   │   │   ├── quality/
│   │   │   │   ├── export/
│   │   │   │   ├── scm/
│   │   │   │   ├── analitiche/
│   │   │   │   ├── inwork/
│   │   │   │   ├── jobs/
│   │   │   │   ├── settings/
│   │   │   │   ├── activity-log/
│   │   │   │   ├── file-manager/
│   │   │   │   ├── data-management/
│   │   │   │   ├── widgets/
│   │   │   │   └── mobile/
│   │   │   ├── common/
│   │   │   │   ├── guards/        # JwtAuthGuard, PermissionsGuard
│   │   │   │   ├── decorators/    # @LogActivity, @RequirePermissions
│   │   │   │   └── filters/       # Exception filters
│   │   │   └── prisma/            # PrismaService
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Schema database
│   │   │   ├── seed.ts            # Dati iniziali
│   │   │   └── migrations/
│   │   └── storage/               # Output job PDF/Excel/ZIP
│   │
│   ├── frontend/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/        # Login
│   │       │   └── (dashboard)/   # Tutte le pagine protette
│   │       │       ├── layout.tsx
│   │       │       ├── produzione/
│   │       │       ├── tracking/
│   │       │       ├── riparazioni/
│   │       │       ├── quality/
│   │       │       ├── export/
│   │       │       ├── scm/
│   │       │       ├── analitiche/
│   │       │       ├── inwork/
│   │       │       ├── data-management/
│   │       │       ├── file-manager/
│   │       │       ├── log-attivita/
│   │       │       ├── users/
│   │       │       └── settings/
│   │       ├── components/
│   │       │   ├── layout/        # Sidebar, Header, PageHeader, Breadcrumb,
│   │       │   │                  # Offcanvas, SpoolModal, Footer, Dock
│   │       │   ├── dashboard/     # DashboardWidgets
│   │       │   └── ui/            # Primitivi UI
│   │       ├── lib/
│   │       │   └── api.ts         # Client Axios con JWT interceptor
│   │       └── store/
│   │           ├── auth.ts        # Zustand auth store
│   │           └── modules.ts     # Moduli attivi
│   │
│   └── mobile/                    # PWA operatori
│
├── docker-compose.yml
├── .env.example
├── RULES.md                       # Knowledge base architettura
└── README.md
```

---

## Moduli

### Tracking — Tracciabilità Cartellini-Lotti

Collega i cartellini di produzione (`core_dati`) ai lotti fisici, gestisce metadati DDT, date ordine e SKU articoli.

**Pagine:** Dashboard · Ricerca Multipla (7 filtri) · Inserimento Manuale · Albero Dettagli · Dati Mancanti · Report · Archivio & Compattamento

**Output:** PDF distinta imballaggio, Excel, fiches individuali, mastrino ASCII storico (via job queue)

**Tabelle:** `track_links`, `track_types`, `track_lots_info`, `track_order_info`, `track_sku`, `track_links_archive`

---

### Produzione — Tracciamento Giornaliero

Fasi e reparti completamente configurabili da UI. Registrazione valori giornalieri per reparto con calendario mensile, statistiche e trend.

**Pagine:** Calendario · Inserimento · Statistiche · Configurazione fasi/reparti

**Output:** PDF report giornaliero (layout legacy-compatible)

**Tabelle:** `prod_phases`, `prod_departments`, `prod_records`, `prod_values`

---

### Riparazioni

Gestione riparazioni con laboratori di destinazione (interni/esterni), reparti di provenienza, numerata taglie, causale e stampa cedola.

**Pagine:** Dashboard · Nuova Riparazione · Elenco · Dettaglio

**Output:** Cedola riparazione PDF, Cedola tecnica PDF (landscape, palette grigia)

**Tabelle:** `rip_riparazioni`, `rip_reparti`, `rip_laboratori`, `rip_idnumerate`

---

### Controllo Qualità

Registrazione difetti su cartellini, foto eccezioni, statistiche per dipartimento e report periodici.

**Pagine:** Dashboard · Consulto Record · Report

**Tabelle:** `cq_records`, `cq_exceptions`, `cq_departments`, `cq_deftypes`

---

### Export / DDT

Emissione documenti di trasporto verso terzisti. Gestione articoli master, vettori, aspetto merce e voci doganali.

**Pagine:** Dashboard · Nuovo DDT · Elenco · Dettaglio

**Output:** PDF DDT

**Tabelle:** `exp_documenti`, `exp_righe_documento`, `exp_piede_documenti`, `exp_articoli_master`, `exp_terzisti`, `exp_vettori`, `exp_aspetto_merce`

---

### SCM — Supply Chain Management

Tracciamento lanci di produzione verso laboratori esterni. Fasi di lavorazione configurabili, cronologia avanzamento per articolo.

**Pagine:** Dashboard · Lanci

**Tabelle:** `scm_laboratories`, `scm_launches`, `scm_launch_articles`, `scm_article_phases`, `scm_standard_phases`, `scm_progress_tracking`

---

### Analitiche

Import di file Excel dall'ERP esterno per analisi costi per reparto. Storico importazioni con confronto periodi.

**Pagine:** Dashboard · Carica Dati · Elenco Record · Storico Import

**Tabelle:** `ana_records`, `ana_reparti`, `ana_imports`

---

### InWork — Operatori Mobile

Gestione operatori con PIN e matricola, permessi per modulo. Usato dall'app PWA mobile per accesso senza credenziali full.

**Tabelle:** `inwork_operators`, `inwork_module_permissions`, `inwork_available_modules`

---

### Framework / Admin

| Modulo | Descrizione |
|--------|-------------|
| **Gestione Dati** | Import/export Excel, sincronizzazione `core_dati` |
| **Log Attività** | Audit trail completo (login, create, update, delete) |
| **File Manager** | Browser file MinIO con filtri MIME, preview, download |
| **Utenti** | CRUD utenti, assegnazione permessi per modulo |
| **Impostazioni** | Config globali azienda, logo, import Excel ordini |
| **Widgets** | Dashboard personalizzabile per utente |

---

## Database

### Tecnologia
- **Engine:** MySQL 8.0
- **ORM:** Prisma 5.x
- **Schema:** `apps/backend/prisma/schema.prisma`

### Tabelle di sistema

```
core_dati          Cartellini produzione (legacy, PK: cartel)
core_anag          Anagrafica clienti/fornitori
core_settings      Configurazioni globali key-value
core_jobs          Job asincroni (status: queued/running/done/failed)
core_log           Audit activity log
minio_files        Metadata file su MinIO
auth_users         Utenti del sistema
auth_permissions   Permessi per utente (JSON per modulo)
auth_widget_config Configurazione widget dashboard
```

### Prefissi tabelle per modulo

| Prefisso | Modulo |
|----------|--------|
| `core_` | Sistema, auth, jobs |
| `prod_` | Produzione |
| `track_` | Tracking |
| `rip_` | Riparazioni |
| `cq_` | Controllo Qualità |
| `exp_` | Export/DDT |
| `scm_` | Supply Chain |
| `ana_` | Analitiche |
| `inwork_` | Operatori Mobile |

### Migrazioni

```bash
# Sviluppo (genera migration + applica)
npx prisma migrate dev --name nome_migration

# Produzione (solo apply)
npx prisma migrate deploy

# Genera client Prisma
npx prisma generate

# GUI database
npx prisma studio
```

---

## Sistema Job Asincroni

Le operazioni lunghe (generazione PDF, Excel, ZIP) passano per una job queue BullMQ + Redis, in modo da non bloccare le richieste HTTP.

### Flusso

```
Richiesta utente
      ↓
POST /jobs  →  JobsService (insert DB, status: queued)
      ↓
BullMQ Queue (Redis)
      ↓
Worker → Handler specifico (es: track.report-lot-pdf)
      ↓
File scritto su /storage/jobs/{userId}/{jobId}/
      ↓
DB aggiornato (status: done, outputPath)
      ↓
SpoolModal (frontend) → download file
```

### Handler registrati

| Job Type | Output | Descrizione |
|----------|--------|-------------|
| `track.report-lot-pdf` | PDF | Distinta imballaggio per lotti |
| `track.report-cartel-pdf` | PDF | Distinta imballaggio per cartellini |
| `track.report-lot-excel` | Excel | Export dati lotti |
| `track.report-cartel-excel` | Excel | Export dati cartellini |
| `track.report-fiches-pdf` | PDF | Fiches individuali |
| `track.compact-report-pdf` | PDF | Mastrino ASCII storico archivio |
| `prod.report-pdf` | PDF | Report produzione giornaliera |
| `riparazioni.cedola-pdf` | PDF | Cedola riparazione |
| `riparazioni.cedola-tecnica-pdf` | PDF | Cedola tecnica (landscape) |

### SpoolModal

Componente frontend (`components/layout/SpoolModal.tsx`) integrato nell'Header. Mostra i job dell'utente corrente con:
- 3 tab: **FILES** · **IN CODA** · **COMPLETI**
- Auto-refresh ogni 5 secondi
- Multi-select (Ctrl+click, Shift+click) per operazioni batch
- Download singolo, ZIP multiplo, Merge PDF, elimina

### Config BullMQ

```typescript
defaultJobOptions: {
  attempts: 2,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
}
```

---

## Autenticazione e Permessi

### Flow JWT

1. `POST /auth/login` con `{ userName, password }` → ritorna token JWT
2. Frontend salva token in `localStorage` (chiave: `coregre-auth`)
3. Axios interceptor aggiunge `Authorization: Bearer <token>` a ogni richiesta
4. Risposta `401` → logout automatico + redirect `/login`

### Permessi per modulo

Ogni utente ha un oggetto `Permission` con flag booleani per ogni modulo:

```json
{
  "produzione": true,
  "tracking": true,
  "quality": true,
  "export": true,
  "scm": true,
  "riparazioni": true,
  "analitiche": false,
  "inwork": false,
  "settings": false,
  "users": false,
  "log": false,
  "dbsql": false,
  "file-manager": false
}
```

Guard backend: `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermissions('modulo')`

Sidebar frontend: voci nascoste automaticamente se il permesso è `false` o il modulo è disattivato.

---

## Installazione

### Requisiti

- Node.js >= 18
- MySQL 8.0
- Redis 7.0
- MinIO (opzionale, per file storage)

### Sviluppo locale

```bash
# 1. Clona e installa dipendenze
git clone <repo>
cd CoreGREJS
npm install

# 2. Configura variabili d'ambiente
cp .env.example .env
# → modifica DATABASE_URL e le altre variabili

# 3. Setup database
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# 4. Avvia tutto
npm run dev
# Backend:  http://localhost:3011
# API Docs: http://localhost:3011/api/docs
# Frontend: http://localhost:3010
# Mobile:   http://localhost:3012
```

### Docker (produzione)

```bash
# 1. Crea network condivisa CoreSuite
docker network create core-network

# 2. Avvia
docker-compose up -d

# 3. Prima esecuzione: migrazioni e seed
docker exec coregrejs-backend npx prisma migrate deploy
docker exec coregrejs-backend npx prisma db seed
```

**Credenziali di default (dopo seed):**
- `admin` / `admin123` — accesso completo
- `operatore` / `operator123` — accesso limitato

---

## Variabili di Ambiente

```env
# App
NODE_ENV=production

# Database
DATABASE_URL=mysql://user:pass@host:3306/coregrejs

# Redis (job queue)
REDIS_HOST=core-redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h

# URLs
FRONTEND_URL=http://localhost:3010
NEXT_PUBLIC_API_URL=http://localhost:3011

# MinIO (object storage)
MINIO_ENDPOINT=core-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=coregre-storage

# Mobile (IP server fisico per PWA locale)
MOBILE_LISTEN_IP=192.168.1.100
MOBILE_BACKEND_URL=http://192.168.1.100:3011

# Timezone
TZ=Europe/Rome
```

---

## Comandi Utili

```bash
# Sviluppo
npm run dev              # Avvia backend + frontend + mobile
npm run dev:backend
npm run dev:frontend
npm run dev:mobile

# Build
npm run build
npm run build:backend
npm run build:frontend

# Database
npx prisma generate      # Rigenera client Prisma
npx prisma migrate dev   # Nuova migration (sviluppo)
npx prisma migrate deploy # Apply migrations (produzione)
npx prisma db seed       # Dati iniziali
npx prisma studio        # GUI web database

# Lint
npm run lint:backend
npm run lint:frontend
```

---

## Convenzioni

### Backend

- **Guards:** `@UseGuards(JwtAuthGuard, PermissionsGuard)` su ogni controller protetto
- **DTOs:** validation con `class-validator` (`@IsNotEmpty`, `@IsString`, ecc.)
- **Errori:** `throw new BadRequestException()`, `throw new NotFoundException()`
- **Date:** sempre UTC — `new Date(Date.UTC(y, m-1, d))`, mai `new Date(dateString)`
- **Tabelle:** `@@map("prefisso_nome_tabella")`, campi con `@map("snake_case")`
- **Audit:** decorator `@LogActivity` su endpoint write

### Frontend

- **API calls:** metodi raggruppati per feature in `src/lib/api.ts` (es: `trackingApi.search()`)
- **Notifiche:** `showSuccess()` / `showError()` da `@/store/notifications`
- **Layout pagina:** `PageHeader` + `Breadcrumb` + corpo con sidebar+content
- **Job lunghi:** enqueue via `jobsApi.enqueue(type, payload)`, download da SpoolModal
- **Animazioni:** `motion.div` Framer Motion con `containerVariants` / `itemVariants`

### Job Handler

Ogni handler in `apps/backend/src/modules/jobs/handlers/`:
1. Riceve `{ payload, job, prisma, jobsService }`
2. Scrive file in `storage/jobs/{userId}/{jobId}/`
3. Chiama `jobsService.markDone(jobId, { outputPath, outputName, outputMime, outputSize })`
4. In caso di errore: `jobsService.markFailed(jobId, errorMessage)`
5. Viene registrato in `handlers/index.ts`

---

## Integrazione CoreSuite

CoreGREJS condivide l'infrastruttura con gli altri moduli CoreSuite tramite Docker network:

| Servizio | Hostname Docker | Porta |
|----------|----------------|-------|
| MySQL | `core-mysql` | 3306 |
| Redis | `core-redis` | 6379 |
| MinIO | `core-minio` | 9000 |
| Network | `core-network` | — |

---

## Documentazione API

Swagger disponibile a runtime:
- **Dev:** `http://localhost:3011/api/docs`
- **Prod:** `http://your-server:3011/api/docs`

Inserire il token JWT nella sezione "Authorize" (formato `Bearer <token>`).

---

*CoreGREJS — Emmegiemme Shoes SRL*
