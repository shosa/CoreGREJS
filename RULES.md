# CoreGREJS - Knowledge Base per AI Agents

> **Scopo**: Documento di riferimento rapido per AI agents che lavorano su CoreGREJS.
> Contiene architettura, componenti chiave, pattern e convenzioni del sistema ERP.

---

## 🏗️ ARCHITETTURA STACK

### Backend
- **Framework**: NestJS 10.x + TypeScript
- **Database**: MySQL 8 + Prisma ORM 5.x
- **Auth**: JWT con Passport (JwtAuthGuard su tutti i controller)
- **Queue**: BullMQ 5.x + Redis (sistema job asincroni)
- **File Gen**: PDFKit (PDF) + ExcelJS (Excel) + Archiver (ZIP)

### Frontend
- **Framework**: Next.js 14 App Router + React 18 + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand (auth store in `coregre-auth`)
- **HTTP**: Axios con interceptor per JWT token
- **Build**: Turbo repo monorepo

### Struttura Progetto
```
CoreGREJS/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/modules/  # Feature modules
│   │   ├── prisma/       # Schema + migrations
│   │   └── storage/      # File uploads/jobs
│   └── frontend/         # Next.js App
│       ├── src/app/      # App Router pages
│       ├── src/components/ # UI components
│       └── src/lib/      # Utils (api.ts, store)
└── packages/             # Shared packages
```

---

## 🎯 SISTEMA JOB ASINCRONI (BullMQ + Redis)

### Architettura
```
User Request → JobsController → JobsService (DB create)
                    ↓
              JobsQueueService (BullMQ)
                    ↓
              Redis Queue → Worker → Handler
                    ↓
              File Output → DB update (status: done)
                    ↓
              User download via SpoolModal
```

### Componenti Backend
**Percorso**: `apps/backend/src/modules/jobs/`

- `jobs.module.ts` - Module NestJS (imports: Prisma, Config, Tracking, Produzione)
- `jobs.service.ts` - CRUD job (create, list, get, delete, mark running/done/failed)
- `jobs.queue.ts` - BullMQ worker con handler routing + retry logic
- `jobs.controller.ts` - API REST endpoints
- `handlers/index.ts` - Registry handler per job type
- `handlers/*.ts` - Implementazione handler specifici

### Handler Implementati
1. `track.report-lot-pdf` - Distinta imballaggio per lotti (PDF multi-colonna)
2. `track.report-cartel-pdf` - Distinta imballaggio per cartellini (PDF)
3. `track.report-lot-excel` - Export Excel per lotti (ExcelJS)
4. `track.report-cartel-excel` - Export Excel per cartellini (ExcelJS)
5. `track.report-fiches-pdf` - Fiches/schede individuali (PDF)
6. `prod.report-pdf` - Report produzione giornaliera (PDF)

### Database Schema (Prisma)
```prisma
model Job {
  id           String   @id @default(uuid()) @db.Char(36)
  userId       Int
  type         String   @db.VarChar(100)
  payload      Json
  status       String   @db.VarChar(20) // queued, running, done, failed
  progress     Int      @default(0)
  outputPath   String?  // /storage/jobs/[userId]/[jobId]/file.pdf
  outputName   String?
  outputMime   String?
  outputSize   Int?
  errorMessage String?
  startedAt    DateTime?
  finishedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(...)
  @@map("core_jobs")
}
```

### API Endpoints
```
POST   /jobs                 - Enqueue new job
GET    /jobs?status=queued   - List user jobs (filtro opzionale)
GET    /jobs/:id             - Job details
GET    /jobs/:id/download    - Download output file
DELETE /jobs/:id             - Delete job
POST   /jobs/merge-pdf       - Merge multiple PDFs
POST   /jobs/zip             - Create ZIP archive
```

### Frontend Component
**Percorso**: `apps/frontend/src/components/layout/SpoolModal.tsx`

**Features**:
- 3 Tab: FILES | IN CODA | COMPLETI
- Auto-refresh ogni 5 secondi
- Multi-select (Ctrl+click, Shift+click)
- Batch operations: Download ZIP, Merge PDF, Delete
- Status badges: queued (amber), running (blue), done (green), failed (red)

**Utilizzo**:
```tsx
import { SpoolModal } from '@/components/layout/SpoolModal';
// Topbar apre modal con icona spool + badge contatore
```

### BullMQ Config
```typescript
defaultJobOptions: {
  attempts: 2,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
}
```

---

## 📦 MODULO TRACKING (Tracciabilità Cartellini-Lotti)

### Scopo
Collegare cartellini produzione (da `core_dati`) con lotti fisici di tracciabilità, gestire metadati DDT/date/SKU.

### Percorsi
- **Backend**: `apps/backend/src/modules/tracking/`
- **Frontend**: `apps/frontend/src/app/(dashboard)/tracking/`

### Pagine Frontend
1. `/tracking` - Dashboard con 4 stats cards + 5 navigation cards
2. `/tracking/multi-search` - Ricerca multi-filtro (7 filtri), risultati raggruppati per modello con totale paia
3. `/tracking/order-search` - Input manuale cartellini, validazione real-time
4. `/tracking/process-links` - Form: seleziona Tipo tracking + inserisci Lotti (textarea)
5. `/tracking/tree-view` - Albero gerarchico Cartellino → Tipo → Lotti (edit/delete inline)
6. `/tracking/lot-detail` - 3 Tab per completare dati mancanti (Lotti senza DDT, Ordini senza date, Articoli senza SKU)
7. `/tracking/reports` - Generazione report PDF/Excel (usa sistema job)

### Database Schema
```prisma
TrackLink       - Collegamenti cartel-tipo-lotto
TrackType       - Tipi di tracking (es: "Taglio", "Orlatura")
TrackLotInfo    - Metadati lotti (DDT, data, note)
TrackOrderInfo  - Date ordini
TrackSku        - SKU articoli
```

### Flusso Tipico
```
MultiSearch → Seleziona cartellini → ProcessLinks → Scegli Tipo + Lotti → Salva
                                         ↓
                              TrackLink DB record creati
                                         ↓
                         TreeView per visualizzare/editare
                                         ↓
                         LotDetail per completare metadati
                                         ↓
                         Reports per generare PDF/Excel (job async)
```

### API Endpoints (Tracking)
```
POST /tracking/search-data        - Ricerca con 7 filtri (ritorna anche `paia`)
POST /tracking/check-cartel       - Valida cartellino singolo
POST /tracking/save-links         - Salva collegamenti {typeId, lots[], cartelli[]}
GET  /tracking/tree-data          - Carica albero (pagination)
PUT  /tracking/update-lot/:id     - Modifica lotto
DELETE /tracking/delete-lot/:id   - Elimina collegamento
GET  /tracking/lots-without-ddt   - Tab1: Lotti incompleti
GET  /tracking/orders-without-date - Tab2: Ordini incompleti
GET  /tracking/articles-without-sku - Tab3: Articoli incompleti
POST /tracking/update-lot-info    - Completa DDT/date lotto
POST /tracking/update-order-info  - Completa data ordine
POST /tracking/update-sku         - Completa SKU articolo
POST /tracking/load-summary       - Carica dati per report
```

---

## 🏭 MODULO PRODUZIONE (Dinamico)

### Scopo
Tracciare produzione giornaliera per reparti configurabili (Montaggio, Orlatura, Taglio, ecc.).

### Percorsi
- **Backend**: `apps/backend/src/modules/produzione/`
- **Frontend**: `apps/frontend/src/app/(dashboard)/produzione/`

### Pagine Frontend
1. `/produzione` - Calendario mensile con giorni evidenziati se hanno dati
2. `/produzione/new` - Form inserimento/modifica (date picker, valori + note per reparto)
3. `/produzione/[date]` - View read-only + bottone PDF
4. `/produzione/statistics` - Dashboard con KPI cards, trend chart, performance reparti
5. `/produzione/config` - CRUD fasi e reparti (nome, codice, colore, icona, ordine)

### Database Schema (Dinamico)
```prisma
ProductionPhase      - Fasi (es: Montaggio, Orlatura, Taglio)
                     - Campi: nome, codice, colore, icona, ordine, attivo
ProductionDepartment - Reparti sotto fasi (es: Manovia 1, Orlatura 3)
                     - Campi: phaseId, nome, codice, ordine, attivo
ProductionRecord     - Record giornaliero (production_date UNIQUE)
ProductionValue      - Valori effettivi (recordId, departmentId, valore, note)
                     - @@unique([recordId, departmentId])
```

### Caratteristiche
- **Completamente dinamico**: Fasi e reparti configurabili da UI
- **Color coding**: 5 colori (blue, green, purple, orange, red)
- **Icone Font Awesome**: fa-industry, fa-cog, fa-cut, fa-hammer, ecc.
- **UTC dates**: Tutti i record usano Date.UTC() per evitare timezone issues
- **Totali dinamici**: Calcolati runtime sommando valori per fase

### Generazione PDF
**Handler**: `prod.report-pdf` (usa sistema job)

**Layout** (compatibile con legacy PHP/TCPDF):
1. Header: "PRODUZIONE [GIORNO] [DATA] [MESE] [ANNO]"
2. Dati Giornalieri: Tabella reparti con valori e note (righe alternate grigio/bianco)
3. Riepilogo Settimana: Lunedì-Sabato con totali per reparto
4. Riepilogo Mese: Settimane raggruppate con totali mensili
5. Totali Finali: Box per fase con somme (layout orizzontale)
6. Footer: "CALZATURIFICIO EMMEGIEMME SHOES SRL"

**Download**: Bottone PDF nelle pagine view/edit → fetch con Bearer token → apre blob in nuova tab

### API Endpoints (Produzione)
```
GET  /produzione/phases           - Lista fasi attive
POST /produzione/phases           - Crea fase
PUT  /produzione/phases/:id       - Modifica fase
DELETE /produzione/phases/:id     - Elimina fase (cascade reparti)

GET  /produzione/departments      - Lista reparti attivi
POST /produzione/departments      - Crea reparto
PUT  /produzione/departments/:id  - Modifica reparto
DELETE /produzione/departments/:id - Elimina reparto

GET  /produzione/calendar?month&year - Calendario (giorni con dati)
GET  /produzione/date/:date       - Dati giornalieri (YYYY-MM-DD)
POST /produzione/date/:date       - Salva/aggiorna produzione
GET  /produzione/pdf/:date        - Genera PDF (job async)

GET  /produzione/today            - Stats giorno corrente
GET  /produzione/week             - Stats settimana corrente
GET  /produzione/month            - Stats mese corrente
GET  /produzione/trend?days=30    - Trend ultimi N giorni
GET  /produzione/comparison       - Confronto mese corrente vs precedente
GET  /produzione/machine-performance - Performance reparti (raggruppati per fase)
```

---

## 🗄️ DATABASE CORE_DATI (Legacy Compatible)

### Tabella Principale
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

### Import Excel
**Percorso**: `apps/backend/src/modules/settings/settings.service.ts` → `importExcel()`

**Funzionamento**:
1. Upload file .xlsx
2. Parsing con ExcelJS (righe 2+, colonne nell'ordine legacy)
3. Mappatura colonne → model CoreDati
4. Preserva cartellini già collegati in `track_links`
5. Upsert batch in transazione Prisma
6. Ritorna { imported, updated, preserved }

**UI**: `/settings` → Tab "Import Excel" → Drag & drop file → Risultato in modal

---

## 🎨 COMPONENTI UI RIUTILIZZABILI

### Layout Components
**Percorso**: `apps/frontend/src/components/layout/`

#### PageHeader
```tsx
<PageHeader
  title="Titolo Pagina"
  subtitle="Descrizione opzionale"
/>
```

#### Breadcrumb
```tsx
<Breadcrumb items={[
  { label: 'Dashboard', href: '/', icon: 'fa-home' },
  { label: 'Tracking', href: '/tracking' },
  { label: 'Multisearch' }, // ultimo senza href
]} />
```

#### Footer (con animazione)
```tsx
<Footer show={hasSelection}>
  <div className="flex justify-between items-center">
    <span>Selezionati: {count}</span>
    <button>Azione</button>
  </div>
</Footer>
```

#### Offcanvas (Pannello Laterale)
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
>
  {/* contenuto */}
</Offcanvas>
```

**Props**:
- `position`: 'left' | 'right'
- `width`: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
- `loading`: boolean (spinner overlay)
- `footer`: ReactNode (pulsanti azioni)

**Z-index**: backdrop z-[1000], panel z-[1001]

#### SpoolModal (Job Manager)
```tsx
// Auto-importato in Topbar
// Icona spool con badge contatore job in coda/running
```

### UI Patterns

#### Cards Valide/Non Valide
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

#### Totale Paia
```tsx
<span className="text-blue-600 dark:text-blue-400 font-semibold">
  Tot Paia: {totale}
</span>
```

#### Loading Spinner
```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  className="h-12 w-12 rounded-full border-4 border-yellow-500 border-t-transparent"
/>
```

#### Color Mapping (Produzione)
```typescript
const PHASE_COLORS = {
  blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700' },
  green: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700' },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700' },
  red: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700' },
};
```

---

## 🔐 AUTENTICAZIONE & SICUREZZA

### Backend Auth Flow
```typescript
// Guard su tutti i controller
@UseGuards(JwtAuthGuard)
export class MyController {
  // req.user disponibile (iniettato da JWT strategy)
  async myMethod(@Request() req) {
    const userId = req.user.id; // ✅
  }
}
```

### Frontend Auth (Zustand)
**Store**: `apps/frontend/src/store/auth.ts`

```typescript
// localStorage key: 'coregre-auth'
const authStore = useAuthStore();
authStore.login(credentials); // POST /auth/login
authStore.logout();           // Clear token + redirect
authStore.user;               // User object
authStore.token;              // JWT token
```

### API Interceptor
**Percorso**: `apps/frontend/src/lib/api.ts`

```typescript
// Automatico: aggiunge Bearer token a tutte le richieste
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

// Automatico: 401 → logout + redirect /login
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

---

## 📁 FILE STORAGE

### Struttura Directory
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

### Download Files
```typescript
// Backend: stream file con headers corretti
res.set({
  'Content-Type': outputMime,
  'Content-Disposition': `inline; filename="${outputName}"`,
  'Content-Length': outputSize,
});
res.sendFile(outputPath);

// Frontend: fetch blob + window.open()
const response = await fetch(url, { headers: { Authorization: ... } });
const blob = await response.blob();
const blobUrl = window.URL.createObjectURL(blob);
window.open(blobUrl, '_blank');
```

---

## 🔧 CONVENZIONI SVILUPPO

### Naming
- **Modules**: singular (es: `tracking.module.ts`, `produzione.service.ts`)
- **API Routes**: plural (es: `/tracking/lots`, `/produzione/phases`)
- **Components**: PascalCase (es: `PageHeader.tsx`, `SpoolModal.tsx`)
- **Database tables**: snake_case con prefisso (es: `core_dati`, `track_links`, `prod_records`)

### File Organization
```
module/
├── module.module.ts       # NestJS module
├── service.ts             # Business logic
├── controller.ts          # HTTP endpoints
├── dto/                   # Data Transfer Objects (validation)
└── handlers/              # Job handlers (se applicabile)
```

### Error Handling
```typescript
// Backend: NestJS exceptions
throw new BadRequestException('Message');
throw new NotFoundException('Resource not found');
throw new UnauthorizedException('Not allowed');

// Frontend: notification store
import { showSuccess, showError } from '@/store/notifications';
showSuccess('Operazione completata');
showError('Errore durante il salvataggio');
```

### Date Handling (UTC)
```typescript
// ✅ SEMPRE usare UTC per date produzione
const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

// ✅ Parsing da string 'YYYY-MM-DD'
const [y, m, d] = dateStr.split('-').map(Number);
const utcDate = new Date(Date.UTC(y, m - 1, d));

// ❌ EVITARE: new Date(dateStr) → problemi timezone
```

### Async Operations
```typescript
// Usa sistema job per operazioni lunghe (PDF, Excel)
const job = await jobsApi.enqueue('track.report-lot-pdf', { filters });
// User scarica da SpoolModal quando done

// Operazioni veloci: await diretto
const data = await produzioneApi.getByDate(date);
```

---

## 🧪 TESTING & DEBUG

### Backend Dev
```bash
cd apps/backend
npm run dev              # Watch mode
npm run prisma:studio    # DB GUI
```

### Frontend Dev
```bash
cd apps/frontend
npm run dev              # http://localhost:3010
```

### Redis (Job Queue)
```bash
# Config in .env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=coresuite_redis

# Test connessione
redis-cli -a coresuite_redis
> PING
PONG
```

### Debug Job
```typescript
// Backend: logs in handler
console.log('[track.report-lot-pdf] Processing:', payload);

// Frontend: SpoolModal mostra status + errorMessage
// Check tab "IN CODA" per job stuck
// Check tab "COMPLETI" per job failed (badge rosso)
```

---

## 📚 RIFERIMENTI QUICK

### API Base URL
- **Dev**: `http://localhost:3011/api`
- **Prod**: `${process.env.NEXT_PUBLIC_API_URL}`

### Database
- **Engine**: MySQL 8
- **ORM**: Prisma 5.x
- **Migrations**: `npx prisma migrate dev`
- **Seed**: `npx prisma db seed`

### Key Dependencies
```json
{
  "backend": {
    "nestjs": "^10.0.0",
    "prisma": "^5.22.0",
    "bullmq": "^5.7.16",
    "pdfkit": "^0.15.2",
    "exceljs": "^4.4.0"
  },
  "frontend": {
    "next": "14.x",
    "react": "^18.0.0",
    "tailwindcss": "^3.4.0",
    "framer-motion": "^11.0.0",
    "zustand": "^4.5.0"
  }
}
```

---

## ✅ CHECKLIST NUOVA FEATURE

1. **Backend Module**
   - [ ] Create module/service/controller
   - [ ] Add Prisma schema models
   - [ ] Run `prisma migrate dev`
   - [ ] Add to `app.module.ts` imports

2. **API Endpoints**
   - [ ] Add `@UseGuards(JwtAuthGuard)`
   - [ ] Validate DTOs con class-validator
   - [ ] Handle errors con NestJS exceptions
   - [ ] Test con Postman/Thunder Client

3. **Frontend API Client**
   - [ ] Add methods in `lib/api.ts`
   - [ ] Group by feature (es: `produzioneApi.xyz()`)
   - [ ] Use interceptor (auto-token)

4. **Frontend Pages**
   - [ ] Create in `app/(dashboard)/[module]/`
   - [ ] Use layout components (PageHeader, Breadcrumb)
   - [ ] Add to Sidebar.tsx navigation
   - [ ] Framer Motion animations

5. **Job Handler** (se lungo)
   - [ ] Create in `jobs/handlers/[type].ts`
   - [ ] Register in `handlers/index.ts`
   - [ ] Save output in `/storage/jobs/[userId]/[jobId]/`
   - [ ] Update job status (running → done/failed)

6. **Documentation**
   - [ ] Update RULES.md
   - [ ] Add JSDoc comments
   - [ ] Update API collection

---

**Ultimo Aggiornamento**: 21/11/2024
**Moduli Completi**: Tracking, Produzione, Jobs System
**In Sviluppo**: Quality Control, Export, MRP
