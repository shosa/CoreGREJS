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
- [Autenticazione e Sicurezza](#autenticazione-e-sicurezza)
- [Componenti UI Riutilizzabili](#componenti-ui-riutilizzabili)
- [File Storage](#file-storage)
- [Installazione](#installazione)
- [Variabili di Ambiente](#variabili-di-ambiente)
- [Comandi Utili](#comandi-utili)
- [Convenzioni di Sviluppo](#convenzioni-di-sviluppo)
- [Checklist Nuova Feature](#checklist-nuova-feature)
- [Troubleshooting e Debug](#troubleshooting-e-debug)
- [Integrazione CoreSuite](#integrazione-coresuite)
- [Documentazione API](#documentazione-api)

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
| Archiver | — | Creazione archivi ZIP |
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
│   │   │   │   │   ├── jobs.module.ts
│   │   │   │   │   ├── jobs.service.ts
│   │   │   │   │   ├── jobs.queue.ts
│   │   │   │   │   ├── jobs.controller.ts
│   │   │   │   │   └── handlers/
│   │   │   │   │       ├── index.ts       # Registry handler per job type
│   │   │   │   │       └── *.ts           # Implementazioni specifiche
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
│   │       ├── jobs/
│   │       │   └── [userId]/
│   │       │       └── [jobId]/
│   │       └── uploads/
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
└── README.md
```

Ogni modulo backend segue questa struttura interna:

```
module/
├── module.module.ts       # NestJS module (imports, providers, exports)
├── service.ts             # Business logic
├── controller.ts          # HTTP endpoints
└── dto/                   # Data Transfer Objects (class-validator)
```

---

## Moduli

### Tracking — Tracciabilità Cartellini-Lotti

Collega i cartellini di produzione (`core_dati`) ai lotti fisici, gestisce metadati DDT, date ordine e SKU articoli.

**Pagine:**

| Rotta | Descrizione |
|-------|-------------|
| `/tracking` | Dashboard con stats cards e navigation cards |
| `/tracking/multi-search` | Ricerca multi-filtro (7 filtri), risultati raggruppati per modello con totale paia |
| `/tracking/order-search` | Input manuale cartellini con validazione real-time |
| `/tracking/process-links` | Form: seleziona Tipo tracking + inserisci Lotti (textarea) |
| `/tracking/tree-view` | Albero gerarchico Cartellino > Tipo > Lotti (edit/delete inline) |
| `/tracking/lot-detail` | 3 tab per completare dati mancanti (Lotti senza DDT, Ordini senza date, Articoli senza SKU) |
| `/tracking/reports` | Generazione report PDF/Excel tramite job queue |

**Output:** PDF distinta imballaggio, Excel, fiches individuali, mastrino ASCII storico (via job queue)

**Tabelle:** `track_links`, `track_types`, `track_lots_info`, `track_order_info`, `track_sku`, `track_links_archive`

**Schema Prisma:**

```prisma
TrackLink       - Collegamenti cartel-tipo-lotto
TrackType       - Tipi di tracking (es: "Taglio", "Orlatura")
TrackLotInfo    - Metadati lotti (DDT, data, note)
TrackOrderInfo  - Date ordini
TrackSku        - SKU articoli
```

**Flusso tipico:**

```
MultiSearch → Seleziona cartellini → ProcessLinks → Scegli Tipo + Lotti → Salva
                                         |
                              TrackLink DB record creati
                                         |
                         TreeView per visualizzare/editare
                                         |
                         LotDetail per completare metadati
                                         |
                         Reports → job async → SpoolModal → download
```

**API Endpoints:**

```
POST   /tracking/search-data           Ricerca con 7 filtri (ritorna anche `paia`)
POST   /tracking/check-cartel          Valida cartellino singolo
POST   /tracking/save-links            Salva collegamenti {typeId, lots[], cartelli[]}
GET    /tracking/tree-data             Carica albero (paginato)
PUT    /tracking/update-lot/:id        Modifica lotto
DELETE /tracking/delete-lot/:id        Elimina collegamento
GET    /tracking/lots-without-ddt      Tab1: Lotti incompleti
GET    /tracking/orders-without-date   Tab2: Ordini incompleti
GET    /tracking/articles-without-sku  Tab3: Articoli incompleti
POST   /tracking/update-lot-info       Completa DDT/date lotto
POST   /tracking/update-order-info     Completa data ordine
POST   /tracking/update-sku            Completa SKU articolo
POST   /tracking/load-summary          Carica dati per report
```

---

### Produzione — Tracciamento Giornaliero

Fasi e reparti completamente configurabili da UI. Registrazione valori giornalieri per reparto con calendario mensile, statistiche e trend.

**Pagine:**

| Rotta | Descrizione |
|-------|-------------|
| `/produzione` | Calendario mensile con giorni evidenziati se hanno dati |
| `/produzione/new` | Form inserimento/modifica (date picker, valori + note per reparto) |
| `/produzione/[date]` | View read-only + bottone PDF |
| `/produzione/statistics` | Dashboard con KPI cards, trend chart, performance reparti |
| `/produzione/config` | CRUD fasi e reparti (nome, codice, colore, icona, ordine) |

**Output:** PDF report giornaliero (layout legacy-compatible con PHP/TCPDF)

**Tabelle:** `prod_phases`, `prod_departments`, `prod_records`, `prod_values`

**Schema Prisma (dinamico):**

```prisma
ProductionPhase      - Fasi (es: Montaggio, Orlatura, Taglio)
                     - Campi: nome, codice, colore, icona, ordine, attivo
ProductionDepartment - Reparti sotto fasi (es: Manovia 1, Orlatura 3)
                     - Campi: phaseId, nome, codice, ordine, attivo
ProductionRecord     - Record giornaliero (production_date UNIQUE)
ProductionValue      - Valori effettivi (recordId, departmentId, valore, note)
                     - @@unique([recordId, departmentId])
```

**Caratteristiche:**
- Completamente dinamico: fasi e reparti configurabili da UI senza modifiche al codice
- Color coding su 5 colori: blue, green, purple, orange, red
- Icone Font Awesome: `fa-industry`, `fa-cog`, `fa-cut`, `fa-hammer`, ecc.
- Date sempre in UTC per evitare timezone drift
- Totali dinamici calcolati runtime sommando i valori per fase

**Layout PDF produzione** (compatibile con report legacy PHP):
1. Header: `PRODUZIONE [GIORNO] [DATA] [MESE] [ANNO]`
2. Dati giornalieri: tabella reparti con valori e note (righe alternate grigio/bianco)
3. Riepilogo settimana: Lunedì-Sabato con totali per reparto
4. Riepilogo mese: settimane raggruppate con totali mensili
5. Totali finali: box per fase con somme (layout orizzontale)
6. Footer: `CALZATURIFICIO EMMEGIEMME SHOES SRL`

**API Endpoints:**

```
GET    /produzione/phases              Lista fasi attive
POST   /produzione/phases              Crea fase
PUT    /produzione/phases/:id          Modifica fase
DELETE /produzione/phases/:id          Elimina fase (cascade reparti)

GET    /produzione/departments         Lista reparti attivi
POST   /produzione/departments         Crea reparto
PUT    /produzione/departments/:id     Modifica reparto
DELETE /produzione/departments/:id     Elimina reparto

GET    /produzione/calendar?month&year Calendario (giorni con dati)
GET    /produzione/date/:date          Dati giornalieri (YYYY-MM-DD)
POST   /produzione/date/:date          Salva/aggiorna produzione
GET    /produzione/pdf/:date           Genera PDF (job async)

GET    /produzione/today               Stats giorno corrente
GET    /produzione/week                Stats settimana corrente
GET    /produzione/month               Stats mese corrente
GET    /produzione/trend?days=30       Trend ultimi N giorni
GET    /produzione/comparison          Confronto mese corrente vs precedente
GET    /produzione/machine-performance Performance reparti (raggruppati per fase)
```

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

#### Import Excel (`core_dati`)

Il modulo Settings gestisce l'import del file Excel dall'ERP esterno (`settings.service.ts` → `importExcel()`):

1. Upload file `.xlsx`
2. Parsing con ExcelJS (righe 2+, colonne nell'ordine legacy)
3. Mappatura colonne sul model `CoreDati`
4. Preservazione cartellini già collegati in `track_links`
5. Upsert batch in transazione Prisma
6. Risposta con `{ imported, updated, preserved }`

UI: `/settings` > Tab "Import Excel" > Drag & drop file > Risultato in modal.

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

### Tabella `core_dati` (legacy-compatible)

```prisma
model CoreDati {
  // Metadati ordine
  st          Int?     // Stato
  ordine      String?  // Numero ordine
  rg          String?  // Raggruppamento
  ccli        String?  // Codice cliente
  ragSoc      String?  // Ragione sociale
  cartel      Int      @unique // CARTELLINO (PK unico)
  commCli     String?  // Commessa cliente
  po          String?  // Purchase Order

  // Articolo
  articolo    String?
  descArt     String?
  nu          String?
  marcaEtich  String?
  ln          String?

  // Taglie (P01-P20) - colonne separate
  p01..p20    Int?     // 20 colonne per taglie
  tot         Int?     // Totale paia

  @@map("core_dati")
}
```

### Schema job (`core_jobs`)

```prisma
model Job {
  id           String    @id @default(uuid()) @db.Char(36)
  userId       Int
  type         String    @db.VarChar(100)
  payload      Json
  status       String    @db.VarChar(20) // queued, running, done, failed
  progress     Int       @default(0)
  outputPath   String?   // /storage/jobs/[userId]/[jobId]/file.pdf
  outputName   String?
  outputMime   String?
  outputSize   Int?
  errorMessage String?
  startedAt    DateTime?
  finishedAt   DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  user         User      @relation(...)
  @@map("core_jobs")
}
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

### Architettura e flusso

```
Richiesta utente
      |
POST /jobs --> JobsService (insert DB, status: queued)
      |
BullMQ Queue (Redis)
      |
Worker --> Handler specifico (es: track.report-lot-pdf)
      |
File scritto su /storage/jobs/{userId}/{jobId}/
      |
DB aggiornato (status: done, outputPath)
      |
SpoolModal (frontend) --> download file
```

### Componenti backend

Percorso: `apps/backend/src/modules/jobs/`

| File | Responsabilità |
|------|----------------|
| `jobs.module.ts` | Module NestJS (imports: Prisma, Config, Tracking, Produzione) |
| `jobs.service.ts` | CRUD job (create, list, get, delete, mark running/done/failed) |
| `jobs.queue.ts` | BullMQ worker con handler routing + retry logic |
| `jobs.controller.ts` | API REST endpoints |
| `handlers/index.ts` | Registry handler per job type |
| `handlers/*.ts` | Implementazione handler specifici |

### Handler registrati

| Job Type | Output | Descrizione |
|----------|--------|-------------|
| `track.report-lot-pdf` | PDF | Distinta imballaggio per lotti (multi-colonna) |
| `track.report-cartel-pdf` | PDF | Distinta imballaggio per cartellini |
| `track.report-lot-excel` | Excel | Export dati lotti (ExcelJS) |
| `track.report-cartel-excel` | Excel | Export dati cartellini (ExcelJS) |
| `track.report-fiches-pdf` | PDF | Fiches individuali |
| `track.compact-report-pdf` | PDF | Mastrino ASCII storico archivio |
| `prod.report-pdf` | PDF | Report produzione giornaliera |
| `riparazioni.cedola-pdf` | PDF | Cedola riparazione |
| `riparazioni.cedola-tecnica-pdf` | PDF | Cedola tecnica (landscape) |

### Implementazione handler

Ogni handler in `apps/backend/src/modules/jobs/handlers/` deve:

1. Ricevere `{ payload, job, prisma, jobsService }`
2. Scrivere il file in `storage/jobs/{userId}/{jobId}/`
3. Chiamare `jobsService.markDone(jobId, { outputPath, outputName, outputMime, outputSize })`
4. In caso di errore: `jobsService.markFailed(jobId, errorMessage)`
5. Essere registrato in `handlers/index.ts`

### API Endpoints (Jobs)

```
POST   /jobs                 Enqueue nuovo job
GET    /jobs?status=queued   Lista job dell'utente (filtro opzionale)
GET    /jobs/:id             Dettaglio job
GET    /jobs/:id/download    Download file output
DELETE /jobs/:id             Elimina job
POST   /jobs/merge-pdf       Merge multipli PDF in uno
POST   /jobs/zip             Crea archivio ZIP
```

### SpoolModal (frontend)

Componente: `apps/frontend/src/components/layout/SpoolModal.tsx`

Integrato nell'Header, mostra i job dell'utente corrente con:
- 3 tab: **FILES** · **IN CODA** · **COMPLETI**
- Auto-refresh ogni 5 secondi
- Multi-select (Ctrl+click, Shift+click) per operazioni batch
- Download singolo, ZIP multiplo, Merge PDF, elimina
- Status badge: queued (amber), running (blue), done (green), failed (red)

```tsx
import { SpoolModal } from '@/components/layout/SpoolModal';
// Topbar apre modal con icona spool + badge contatore job
```

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

## Autenticazione e Sicurezza

### Flow JWT

1. `POST /auth/login` con `{ userName, password }` → ritorna token JWT
2. Frontend salva token in `localStorage` (chiave: `coregre-auth`)
3. Axios interceptor aggiunge `Authorization: Bearer <token>` a ogni richiesta
4. Risposta `401` → logout automatico + redirect `/login`

### Backend — Guard e permessi

```typescript
// Tutti i controller protetti
@UseGuards(JwtAuthGuard)
export class MyController {
  async myMethod(@Request() req) {
    const userId = req.user.id; // iniettato da JWT strategy
  }
}

// Con controllo permesso modulo
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('tracking')
export class TrackingController { ... }
```

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

La sidebar nasconde automaticamente le voci per cui il permesso è `false` o il modulo è disattivato.

### Frontend — Zustand auth store

Store: `apps/frontend/src/store/auth.ts` (chiave localStorage: `coregre-auth`)

```typescript
const authStore = useAuthStore();
authStore.login(credentials); // POST /auth/login
authStore.logout();           // Clear token + redirect /login
authStore.user;               // User object
authStore.token;              // JWT token
```

### Frontend — Axios interceptor

Percorso: `apps/frontend/src/lib/api.ts`

```typescript
// Request interceptor: aggiunge Bearer token automaticamente
axios.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('coregre-auth');
  if (authStorage) {
    const token = JSON.parse(authStorage).state?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: 401 -> logout + redirect
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);
```

Le chiamate API sono raggruppate per feature nello stesso file:

```typescript
// Uso corretto
const data = await trackingApi.search(filters);
const job = await jobsApi.enqueue('track.report-lot-pdf', { filters });
```

---

## Componenti UI Riutilizzabili

Tutti i componenti di layout si trovano in `apps/frontend/src/components/layout/`.

### PageHeader

```tsx
<PageHeader
  title="Titolo Pagina"
  subtitle="Descrizione opzionale"
/>
```

### Breadcrumb

```tsx
<Breadcrumb items={[
  { label: 'Dashboard', href: '/', icon: 'fa-home' },
  { label: 'Tracking', href: '/tracking' },
  { label: 'Multisearch' }, // ultimo elemento senza href
]} />
```

### Footer (con animazione slide-up)

Il Footer compare e scompare con animazione Framer Motion in base alla condizione `show`:

```tsx
<Footer show={hasSelection}>
  <div className="flex justify-between items-center">
    <span>Selezionati: {count}</span>
    <button>Azione Batch</button>
  </div>
</Footer>
```

### Offcanvas (Pannello Laterale)

```tsx
<Offcanvas
  open={open}
  onClose={() => setOpen(false)}
  title="Dettagli"
  icon="fa-info-circle"
  iconColor="text-blue-500"
  position="right"
  width="lg"
  searchValue={search}
  onSearchChange={(e) => setSearch(e.target.value)}
  searchPlaceholder="Cerca..."
  loading={isLoading}
  footer={<button>Salva</button>}
>
  {/* contenuto pannello */}
</Offcanvas>
```

**Props:**

| Prop | Tipo | Default | Descrizione |
|------|------|---------|-------------|
| `position` | `'left' \| 'right'` | `'right'` | Lato apertura pannello |
| `width` | `'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | `'md'` | Larghezza pannello |
| `loading` | `boolean` | `false` | Spinner overlay |
| `footer` | `ReactNode` | — | Area pulsanti in fondo |

Z-index: backdrop `z-[1000]`, panel `z-[1001]`.

### Pattern UI comuni

#### Cards valide / non valide

```tsx
// Valido
<div className="bg-green-50 border-green-200 dark:bg-green-900/20">
  <i className="fas fa-check-circle text-green-500" />
</div>

// Non valido
<div className="bg-red-50 border-red-200 dark:bg-red-900/20">
  <i className="fas fa-times-circle text-red-500" />
</div>
```

#### Totale paia

```tsx
<span className="text-blue-600 dark:text-blue-400 font-semibold">
  Tot Paia: {totale}
</span>
```

#### Loading spinner animato

```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  className="h-12 w-12 rounded-full border-4 border-yellow-500 border-t-transparent"
/>
```

#### Animazioni pagina (Framer Motion)

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Utilizzo
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}>Card 1</motion.div>
  <motion.div variants={itemVariants}>Card 2</motion.div>
</motion.div>
```

#### Color mapping fasi produzione

```typescript
const PHASE_COLORS = {
  blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700'   },
  green:  { border: 'border-green-200',  bg: 'bg-green-50',  text: 'text-green-700'  },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700' },
  red:    { border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-700'    },
};
```

---

## File Storage

### Struttura directory

```
apps/backend/storage/
├── jobs/
│   └── [userId]/
│       └── [jobId]/
│           ├── output.pdf
│           ├── output.xlsx
│           └── archive.zip
└── uploads/
    └── [altri file]
```

### Pattern download file

**Backend — stream file con headers:**

```typescript
res.set({
  'Content-Type': outputMime,
  'Content-Disposition': `inline; filename="${outputName}"`,
  'Content-Length': outputSize,
});
res.sendFile(outputPath);
```

**Frontend — fetch blob + apertura nuova tab:**

```typescript
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});
const blob = await response.blob();
const blobUrl = window.URL.createObjectURL(blob);
window.open(blobUrl, '_blank');
```

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
# Modifica DATABASE_URL e le altre variabili

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

| Utente | Password | Accesso |
|--------|----------|---------|
| `admin` | `admin123` | Completo |
| `operatore` | `operator123` | Limitato |

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
npm run dev:backend      # Solo backend
npm run dev:frontend     # Solo frontend
npm run dev:mobile       # Solo mobile

# Build
npm run build
npm run build:backend
npm run build:frontend

# Database
npx prisma generate       # Rigenera client Prisma
npx prisma migrate dev    # Nuova migration (sviluppo)
npx prisma migrate deploy # Apply migrations (produzione)
npx prisma db seed        # Dati iniziali
npx prisma studio         # GUI web database

# Lint
npm run lint:backend
npm run lint:frontend

# Redis (test connessione)
redis-cli -a your_redis_password
> PING
PONG
```

---

## Convenzioni di Sviluppo

### Naming

| Elemento | Convenzione | Esempio |
|----------|-------------|---------|
| Moduli backend | singular | `tracking.module.ts`, `produzione.service.ts` |
| Route API | plural | `/tracking/lots`, `/produzione/phases` |
| Componenti React | PascalCase | `PageHeader.tsx`, `SpoolModal.tsx` |
| Tabelle DB | snake_case con prefisso | `core_dati`, `track_links`, `prod_records` |
| Campi Prisma | camelCase + `@map("snake_case")` | `ragSoc @map("rag_soc")` |
| Store Zustand | `coregre-*` in localStorage | `coregre-auth` |

### Backend — Regole

**Guards su ogni controller protetto:**

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('modulo')
```

**DTOs con class-validator:**

```typescript
export class CreateTrackLinkDto {
  @IsNotEmpty()
  @IsString()
  typeId: string;

  @IsArray()
  lots: string[];
}
```

**Errori con eccezioni NestJS:**

```typescript
throw new BadRequestException('Message');
throw new NotFoundException('Resource not found');
throw new UnauthorizedException('Not allowed');
```

**Audit trail:**

```typescript
@LogActivity   // decorator su endpoint write
async createRecord(...) { ... }
```

**Ordine route nei controller:** le route statiche vanno dichiarate PRIMA di quelle con parametri.

```typescript
// Corretto
@Get('calendar')   // prima
@Get('date/:date') // dopo
```

### Frontend — Regole

**API calls** raggruppate per feature in `src/lib/api.ts`:

```typescript
// Corretto
const data = await trackingApi.search(filters);
const job  = await jobsApi.enqueue('track.report-lot-pdf', { filters });
```

**Notifiche:**

```typescript
import { showSuccess, showError } from '@/store/notifications';
showSuccess('Operazione completata');
showError('Errore durante il salvataggio');
```

**Layout pagina standard:** `PageHeader` + `Breadcrumb` + corpo con sidebar + content.

**Job lunghi:** enqueue via `jobsApi.enqueue(type, payload)`, download dall'utente tramite SpoolModal.

### Date Handling (UTC)

Tutte le date vanno gestite in UTC per evitare problemi di timezone (specialmente tra server e client):

```typescript
// CORRETTO: costruzione data UTC
const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

// CORRETTO: parsing da stringa 'YYYY-MM-DD'
const [y, m, d] = dateStr.split('-').map(Number);
const utcDate = new Date(Date.UTC(y, m - 1, d));

// DA EVITARE: interpretazione dipendente da timezone locale
const date = new Date(dateStr); // potrebbe essere mezzanotte del giorno prima
```

### Async Operations

```typescript
// Operazioni lunghe (PDF, Excel) -> sistema job
const job = await jobsApi.enqueue('track.report-lot-pdf', { filters });
// L'utente scarica da SpoolModal quando il job è done

// Operazioni veloci -> await diretto
const data = await produzioneApi.getByDate(date);
```

---

## Checklist Nuova Feature

### 1. Backend Module

- [ ] Crea `module.module.ts`, `service.ts`, `controller.ts`
- [ ] Aggiungi modelli Prisma nello schema con prefisso tabella corretto
- [ ] Esegui `npx prisma migrate dev --name nome_feature`
- [ ] Aggiungi il modulo a `app.module.ts` > imports

### 2. API Endpoints

- [ ] Aggiungi `@UseGuards(JwtAuthGuard)` (e `PermissionsGuard` se necessario)
- [ ] Valida input con DTOs e `class-validator`
- [ ] Gestisci errori con eccezioni NestJS standard
- [ ] Testa con Postman/Thunder Client
- [ ] Verifica Swagger su `/api/docs`

### 3. Frontend API Client

- [ ] Aggiungi metodi in `src/lib/api.ts`, raggruppati per feature
- [ ] L'interceptor gestisce il token automaticamente — non aggiungere header manualmente

### 4. Frontend Pages

- [ ] Crea la pagina in `src/app/(dashboard)/[modulo]/page.tsx`
- [ ] Usa `PageHeader` + `Breadcrumb` come layout standard
- [ ] Aggiungi la voce a `Sidebar.tsx` con il permesso corretto
- [ ] Applica animazioni Framer Motion con `containerVariants` / `itemVariants`

### 5. Job Handler (solo se operazione lunga)

- [ ] Crea `apps/backend/src/modules/jobs/handlers/[tipo].ts`
- [ ] Registra il handler in `handlers/index.ts`
- [ ] Scrivi l'output in `/storage/jobs/{userId}/{jobId}/`
- [ ] Aggiorna lo status del job (`running` → `done` o `failed`)

### 6. Permessi

- [ ] Aggiungi il nuovo modulo all'oggetto permessi in `auth_permissions`
- [ ] Aggiorna il seed con il valore di default
- [ ] Verifica che la sidebar rispetti il flag

---

## Troubleshooting e Debug

### Job bloccati in coda

```typescript
// Backend: aggiunge log in cima all'handler
console.log('[track.report-lot-pdf] Processing:', payload);
```

SpoolModal > tab **IN CODA**: mostra i job stuck. Tab **COMPLETI**: i job falliti hanno badge rosso con `errorMessage`.

### Problema timezone date (calendario produzione)

Se il calendario non mostra giorni con dati, verificare che le date siano salvate in UTC:

```typescript
// Aggiungere log nel service per debug
console.log('[produzione] getCalendarData query result:', records.map(r => r.productionDate));
```

Verificare che nel DB `production_date` non abbia offset di un giorno rispetto al valore atteso.

### Connessione Redis

```bash
redis-cli -a your_redis_password
> PING
PONG

# Verifica code BullMQ
> KEYS bull:*
```

### Avvio in sviluppo

```bash
# Backend con watch mode
cd apps/backend && npm run dev

# Frontend
cd apps/frontend && npm run dev

# Prisma Studio per ispezione DB
cd apps/backend && npx prisma studio
```

### API base URL

- **Sviluppo:** `http://localhost:3011/api`
- **Produzione:** valore da `process.env.NEXT_PUBLIC_API_URL`

---

## Integrazione CoreSuite

CoreGREJS condivide l'infrastruttura con gli altri moduli CoreSuite tramite Docker network:

| Servizio | Hostname Docker | Porta |
|----------|----------------|-------|
| MySQL | `core-mysql` | 3306 |
| Redis | `core-redis` | 6379 |
| MinIO | `core-minio` | 9000 |
| Network | `core-network` | — |

Tutti i servizi devono essere configurati con `network_mode: core-network` nel rispettivo `docker-compose.yml`.

---

## Documentazione API

Swagger disponibile a runtime su:
- **Dev:** `http://localhost:3011/api/docs`
- **Prod:** `http://your-server:3011/api/docs`

Inserire il token JWT nella sezione "Authorize" con formato `Bearer <token>`.

---

*CoreGREJS — Emmegiemme Shoes SRL*
