# Setup Modulo Controllo Qualità

## ✅ Setup Completato

Il Prisma Client è stato rigenerato con successo. Il modulo è pronto per l'uso!

### ⚠️ Prossimo Passo: Migrazione Database

Per applicare le modifiche al database, esegui:

1. **Se le tabelle NON esistono ancora** (prima installazione):
   ```bash
   cd apps/backend
   npx prisma migrate dev --name add_quality_module
   ```

2. **Se le tabelle ESISTONO GIÀ** (dal legacy CoreGRE):
   ```bash
   npx prisma db push
   ```

   Oppure verifica prima lo stato:
   ```bash
   npx prisma migrate status
   ```

### ⚠️ IMPORTANTE - Modifiche Schema

Ho aggiornato i modelli Prisma per riflettere la struttura del database legacy CoreGRE:

**Modifiche principali**:
- `QualityRecord`: Usa i campi legacy (numeroCartellino, reparto, operatore, tipoCq, etc.)
- `QualityException`: Relazione con QualityRecord tramite cartellinoId
- `QualityDepartment`: Campo nomeReparto invece di nome
- `QualityDefectType`: Campo descrizione invece di nome
- **Operatori**: Riutilizza il modello esistente `InworkOperator` (tabella `inwork_operators`)

### 📋 Verifica Tabelle Esistenti

Prima di applicare le migrazioni, verifica se le tabelle esistono già nel database:

```sql
SHOW TABLES LIKE 'cq_%';
SHOW TABLES LIKE 'inwork_operators';
```

Se le tabelle esistono GIÀ e hanno dati:
- **NON** eseguire `prisma migrate dev` (cancellerebbe i dati)
- Usa invece `prisma db pull` per allineare lo schema ai dati esistenti
- Poi `prisma generate` per rigenerare il client

### 🔧 Se Hai Dati Esistenti

```bash
# 1. Allinea schema Prisma al database esistente
npx prisma db pull

# 2. Rigenera client
npx prisma generate

# 3. Riavvia il backend
```

### ✅ Dopo la Rigenerazione

Una volta completati i passi sopra, il backend dovrebbe compilare senza errori e il modulo Quality sarà completamente funzionante.

### 📂 File Creati

**Backend**:
- `apps/backend/src/modules/quality/quality.module.ts`
- `apps/backend/src/modules/quality/quality.service.ts` (600+ righe)
- `apps/backend/src/modules/quality/quality.controller.ts` (300+ righe)
- `apps/backend/src/modules/quality/dto/*.dto.ts` (8 DTOs)

**Frontend**:
- `apps/frontend/src/lib/api.ts` (aggiunto qualityApi)
- `apps/frontend/src/app/(dashboard)/quality/page.tsx` (dashboard)
- `apps/frontend/src/app/(dashboard)/quality/reparti/page.tsx`
- `apps/frontend/src/app/(dashboard)/quality/difetti/page.tsx`
- `apps/frontend/src/app/(dashboard)/quality/records/page.tsx`
- `apps/frontend/src/app/(dashboard)/quality/create/page.tsx`

### 🎯 Endpoint API Disponibili

Una volta attivo, il modulo espone questi endpoint:

**Dashboard**:
- `GET /api/quality/dashboard/stats`
- `GET /api/quality/dashboard/weekly-records`
- `GET /api/quality/dashboard/exceptions-by-department`
- `GET /api/quality/dashboard/defect-rate-by-department`

**CRUD**:
- `GET/POST/PUT/DELETE /api/quality/departments`
- `GET/POST/PUT/DELETE /api/quality/defect-types`
- `GET /api/quality/operators`

**Records**:
- `GET /api/quality/records` (con filtri)
- `POST /api/quality/records` (crea nuovo controllo)
- `POST /api/quality/check-cartellino`
- `POST /api/quality/check-commessa`

**Utilities**:
- `GET /api/quality/options` (tutte le opzioni per dropdown)
- `GET /api/quality/unique-operators`
- `GET /api/quality/defect-categories`
- `GET /api/quality/operator-summary`

### 🚀 Accesso Frontend

Una volta attivo, accedi al modulo da:
- Dashboard: `http://localhost:3000/quality`
- CRUD Reparti: `http://localhost:3000/quality/reparti`
- CRUD Difetti: `http://localhost:3000/quality/difetti`
- Consulto Record: `http://localhost:3000/quality/records`
- Nuovo Test: `http://localhost:3000/quality/create`

---

**Note**: Il modulo è stato completamente implementato seguendo le specifiche del modulo legacy CoreGRE, mantenendo tutte le funzionalità originali.
