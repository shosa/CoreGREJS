# CoreGREJS - Prompt per Continuazione Sessione

## Contesto del Progetto

Sto riscrivendo l'applicazione **CoreGRE** (originariamente in PHP) come **CoreGREJS** usando lo stack:
- **Backend**: NestJS 10 + Prisma 5 + MySQL
- **Frontend**: Next.js 14 + React 18 + Tailwind CSS + Framer Motion
- **State Management**: Zustand

Il progetto è un monorepo con:
- `apps/backend` - API NestJS
- `apps/frontend` - App Next.js

Il database MySQL esistente contiene già tutte le tabelle - devo solo mappare i modelli Prisma.

---

## Stato Attuale dei Moduli

### Completati
- **Auth** - Login/logout con JWT
- **Users** - CRUD utenti con ruoli
- **Sidebar** - Navigazione con submenu collassabili (click, non hover)
- **Produzione** - Calendario, inserimento dati, statistiche (MA c'è un bug - vedi sotto)
- **Login Page** - Nuova UI con onde arancioni animate

### Da Implementare
- Riparazioni
- Quality
- Export
- SCM (Supply Chain Management)
- Tracking
- MRP
- Settings

---

## Bug da Risolvere - PRIORITARIO

### Calendario Produzione non mostra i giorni con dati (Ottobre/Novembre)

**Problema**: Il calendario in `/produzione` non evidenzia i giorni con dati di produzione per ottobre e novembre, mentre settembre funziona.

**File coinvolti**:
- `apps/backend/src/modules/produzione/produzione.service.ts` - metodo `getCalendarData()`
- `apps/frontend/src/app/(dashboard)/produzione/page.tsx`

**Causa probabile**:
1. Problema di timezone nelle date UTC
2. I campi `total_montaggio`, `total_orlatura`, `total_taglio` nel DB potrebbero essere 0 anche quando i singoli campi (manovia1, manovia2, etc.) hanno valori

**Soluzione già tentata**:
- Uso di `Date.UTC()` e `getUTCDate()`
- Calcolo totali dai campi singoli invece che dai campi total_*

**Da verificare**:
- Controllare se esistono record nel DB con `production_date` in ottobre/novembre 2025
- Aggiungere logging nel service per debug
- Verificare la query Prisma

---

## Struttura Database - Tabella production_records

```sql
CREATE TABLE `production_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `production_date` date NOT NULL,
  `manovia1` int DEFAULT NULL,
  `manovia1_notes` text,
  `manovia2` int DEFAULT NULL,
  `manovia2_notes` text,
  `orlatura1` int DEFAULT NULL,
  `orlatura1_notes` text,
  `orlatura2` int DEFAULT NULL,
  `orlatura2_notes` text,
  `orlatura3` int DEFAULT NULL,
  `orlatura3_notes` text,
  `orlatura4` int DEFAULT NULL,
  `orlatura4_notes` text,
  `orlatura5` int DEFAULT NULL,
  `orlatura5_notes` text,
  `taglio1` int DEFAULT NULL,
  `taglio1_notes` text,
  `taglio2` int DEFAULT NULL,
  `taglio2_notes` text,
  `total_montaggio` int DEFAULT NULL,
  `total_orlatura` int DEFAULT NULL,
  `total_taglio` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_production_date` (`production_date`)
);
```

---

## Convenzioni Codice

### Backend (NestJS)
- Ogni modulo in `src/modules/{nome}/`
- Files: `{nome}.module.ts`, `{nome}.service.ts`, `{nome}.controller.ts`
- Import JwtAuthGuard da `../../common/guards/jwt-auth.guard`
- Route statiche PRIMA di route con parametri (es. `/calendar` prima di `/date/:date`)

### Frontend (Next.js)
- Pages in `src/app/(dashboard)/{sezione}/page.tsx`
- API calls in `src/lib/api.ts`
- Componenti layout in `src/components/layout/`
- Store Zustand in `src/store/`

### Stile UI
- Colori primari: arancione (#f97316, #fb923c)
- Card con `rounded-2xl`, `shadow-lg`, bordi `border-gray-200`
- Animazioni con Framer Motion
- NO emoji nei file a meno che richiesto

---

## File Importanti

- `apps/backend/prisma/schema.prisma` - Modelli database
- `apps/frontend/src/lib/api.ts` - Chiamate API
- `apps/frontend/src/components/layout/Sidebar.tsx` - Menu laterale
- `apps/frontend/src/store/auth.ts` - Auth state

---

## Per Continuare

1. **Prima cosa**: Risolvere il bug del calendario produzione
   - Aggiungere console.log nel service per vedere cosa ritorna la query
   - Verificare i dati nel DB per ottobre/novembre

2. **Poi**: Implementare il prossimo modulo (suggerisco Riparazioni o Quality)

3. **Riferimento**: Per capire la struttura delle tabelle, leggere i modelli PHP in `CoreGRE/app/models/`

---

## Comandi Utili

```bash
# Backend
cd apps/backend
npm run start:dev

# Frontend
cd apps/frontend
npm run dev

# Prisma
npx prisma generate
npx prisma db pull
```

---

## Note Aggiuntive

- Il backend gira su porta 3011
- Il frontend gira su porta 3000
- Database MySQL su 192.168.3.131 (o locale)
- Le tabelle esistono già - NON creare migrazioni, solo mappare con Prisma
