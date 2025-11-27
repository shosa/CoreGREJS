# 🚀 CoreGREJS - Modulo Riparazioni: Guida Implementazione Frontend

## ✅ **STATO ATTUALE**

### **COMPLETATO:**
- ✅ Schema Prisma aggiornato con modelli Riparazione, RiparazioneInterna, Numerata
- ✅ Backend NestJS completo (Service + Controller)
- ✅ API frontend library (`riparazioniApi` in `lib/api.ts`)
- ✅ Database migration applicata

### **DA COMPLETARE:**
- ⏳ Frontend pages (Home, Lista, Creazione, Dettaglio)
- ⏳ Sidebar navigation link
- ⏳ PDF generation (Cedola riparazione)

---

## 📁 **STRUTTURA BACKEND IMPLEMENTATA**

### **Files Backend:**
```
apps/backend/src/modules/riparazioni/
├── riparazioni.module.ts       ✅ Module configurato
├── riparazioni.service.ts      ✅ Service completo
└── riparazioni.controller.ts   ✅ Controller con tutti gli endpoint
```

### **Endpoints Disponibili:**

#### **Riparazioni Esterne:**
- `GET /riparazioni/stats` - Dashboard statistics
- `GET /riparazioni` - List con filtri (page, limit, search, completa, laboratorioId, repartoId)
- `GET /riparazioni/next-id` - Get next available idRiparazione
- `GET /riparazioni/:id` - Get by numeric ID
- `GET /riparazioni/id/:idRiparazione` - Get by custom ID (es: "000123")
- `POST /riparazioni` - Create new
- `PUT /riparazioni/:id` - Update
- `PUT /riparazioni/:id/complete` - Mark as completed
- `DELETE /riparazioni/:id` - Delete

#### **Riparazioni Interne:**
- `GET /riparazioni/interne/stats` - Stats
- `GET /riparazioni/interne` - List
- `GET /riparazioni/interne/next-id` - Next ID (formato: "INT000001")
- `GET /riparazioni/interne/:id` - Get by ID
- `POST /riparazioni/interne` - Create
- `PUT /riparazioni/interne/:id` - Update
- `PUT /riparazioni/interne/:id/complete` - Complete con operatoreChiusura
- `DELETE /riparazioni/interne/:id` - Delete

#### **Support Data:**
- `GET /riparazioni/support/reparti` - All reparti
- `GET /riparazioni/support/laboratori` - All laboratori
- `GET /riparazioni/support/linee` - All linee
- `GET /riparazioni/support/numerate` - All numerate
- `GET /riparazioni/support/numerate/:id` - Get numerata by ID

---

## 🎨 **STRUTTURA FRONTEND DA IMPLEMENTARE**

### **Directory Structure:**
```
apps/frontend/src/app/(dashboard)/riparazioni/
├── page.tsx                    ⏳ Home/Dashboard
├── list/
│   └── page.tsx               ⏳ Lista riparazioni
├── create/
│   └── page.tsx               ⏳ Crea nuova riparazione
├── [id]/
│   └── page.tsx               ⏳ Dettaglio riparazione
└── interne/
    ├── page.tsx               ⏳ Home riparazioni interne
    ├── list/
    │   └── page.tsx          ⏳ Lista interne
    ├── create/
    │   └── page.tsx          ⏳ Crea interna
    └── [id]/
        └── page.tsx          ⏳ Dettaglio interna
```

---

## 🎯 **IDEOLOGIA & PATTERN DA SEGUIRE**

### **1. UI/UX Pattern (Stile Export)**

Segui **esattamente** lo stesso pattern del modulo Export:

#### **Home Page Pattern:**
```tsx
// apps/frontend/src/app/(dashboard)/riparazioni/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { riparazioniApi } from "@/lib/api";

export default function RiparazioniPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await riparazioniApi.getStats();
    setStats(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader />
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Riparazioni" },
        ]}
      />

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Stats Cards */}
          <StatsCard
            title="Totale"
            value={stats?.totale || 0}
            icon="fa-wrench"
            color="blue"
          />
          <StatsCard
            title="Aperte"
            value={stats?.aperte || 0}
            icon="fa-folder-open"
            color="orange"
          />
          <StatsCard
            title="Completate"
            value={stats?.completate || 0}
            icon="fa-check-circle"
            color="green"
          />

          {/* Action Cards */}
          <ActionCard
            title="Nuova Riparazione"
            href="/riparazioni/create"
            icon="fa-plus"
            color="blue"
          />
          <ActionCard
            title="Archivio"
            href="/riparazioni/list"
            icon="fa-list"
            color="purple"
          />
          <ActionCard
            title="Riparazioni Interne"
            href="/riparazioni/interne"
            icon="fa-home"
            color="green"
          />
        </motion.div>

        {/* Recent riparazioni table */}
        <RecentRiparazioniTable data={stats?.recent || []} />
      </div>
    </div>
  );
}
```

**Key Points:**
- ✅ Motion animations con Framer Motion
- ✅ Stats cards colorate (blue, orange, green)
- ✅ Action cards per navigazione rapida
- ✅ Recent items table
- ✅ Dark mode support

---

### **2. Lista Page Pattern:**

```tsx
// apps/frontend/src/app/(dashboard)/riparazioni/list/page.tsx

"use client";

import { useState, useEffect } from "react";
import { riparazioniApi } from "@/lib/api";

export default function RiparazioniListPage() {
  const [riparazioni, setRiparazioni] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    completa: undefined,
    laboratorioId: undefined,
    repartoId: undefined,
  });

  useEffect(() => {
    loadRiparazioni();
  }, [filters]);

  const loadRiparazioni = async () => {
    const { data, pagination } = await riparazioniApi.getRiparazioni({
      page: 1,
      limit: 20,
      ...filters,
    });
    setRiparazioni(data);
    setPagination(pagination);
  };

  return (
    <div>
      {/* Filters - Due righe come Export */}
      <FiltersSection filters={filters} onChange={setFilters} />

      {/* Table con @tanstack/react-table */}
      <RiparazioniTable data={riparazioni} />

      {/* Pagination */}
      <PaginationControls pagination={pagination} />
    </div>
  );
}
```

**Key Points:**
- ✅ Filters a 2 righe (prima riga: search + date, seconda riga: dropdowns + reset)
- ✅ Tabella con @tanstack/react-table
- ✅ Pagination controls
- ✅ Status badges colorati (aperta=orange, completata=green)

---

### **3. Create Page Pattern:**

**WORKFLOW 2-STEP come nel Legacy:**

**Step 1:** Input Cartellino
```tsx
// User inserisce numero cartellino
// onClick -> fetch da core_dati (tabella legacy)
// Se trovato -> redirect a Step 2 con dati precaricati
```

**Step 2:** Form con dati precompilati
```tsx
// Dati articolo: readonly (da core_dati)
// Griglia taglie 20 colonne (p01-p20) con input number
// Dropdown: laboratorio, reparto, linea
// Textarea: causale
// Auto-calc qtaTotale

const handleSubmit = async () => {
  const data = {
    idRiparazione: nextId, // auto-generated
    cartellino,
    numerataId,
    userId: currentUser.id,
    p01: parseInt(p01) || 0,
    p02: parseInt(p02) || 0,
    // ... p03-p20
    causale,
    laboratorioId,
    repartoId,
    lineaId,
  };

  await riparazioniApi.createRiparazione(data);
  router.push(`/riparazioni/${result.id}`);
};
```

**Key Points:**
- ✅ 2-step workflow (cartellino -> form)
- ✅ Griglia 20 taglie con input number
- ✅ Totale auto-calcolato
- ✅ Fetch nomi taglie da numerata
- ✅ Validazione: almeno 1 taglia > 0

---

### **4. Detail Page Pattern:**

```tsx
// apps/frontend/src/app/(dashboard)/riparazioni/[id]/page.tsx

export default function RiparazioneDetailPage() {
  const params = useParams();
  const [riparazione, setRiparazione] = useState(null);

  return (
    <div>
      {/* Header con ID e badge stato */}
      <DetailHeader riparazione={riparazione} />

      {/* Info panels */}
      <InfoSection riparazione={riparazione} />

      {/* Griglia taglie readonly */}
      <TaglieGrid
        p01={riparazione.p01}
        // ... p02-p20
        numerata={riparazione.numerata}
      />

      {/* Actions */}
      <ActionsBar>
        {!riparazione.completa && (
          <>
            <EditButton />
            <CompleteButton onClick={handleComplete} />
          </>
        )}
        <PDFButton onClick={handleGeneratePDF} />
      </ActionsBar>
    </div>
  );
}
```

**Key Points:**
- ✅ Badge stato (Aperta=orange, Completata=green)
- ✅ Griglia taglie readonly con nomi
- ✅ Actions bar (Edit, Complete, PDF)
- ✅ PDF generation con Jobs (come Export)

---

## 📊 **COMPONENTI DA CREARE**

### **1. Griglia Taglie Component:**

```tsx
// apps/frontend/src/components/riparazioni/TaglieGrid.tsx

interface TaglieGridProps {
  numerata?: {
    n01?: string;
    n02?: string;
    // ... n03-n20
  };
  values: {
    p01: number;
    p02: number;
    // ... p03-p20
  };
  onChange?: (field: string, value: number) => void;
  readonly?: boolean;
}

export default function TaglieGrid({ numerata, values, onChange, readonly }: TaglieGridProps) {
  const taglie = [];

  // Loop 1-20 per creare array
  for (let i = 1; i <= 20; i++) {
    const pField = `p${String(i).padStart(2, '0')}`;
    const nField = `n${String(i).padStart(2, '0')}`;
    const nomeTaglia = numerata?.[nField] || `T${i}`;
    const quantita = values[pField] || 0;

    // Salta taglie con qta=0 in readonly mode
    if (readonly && quantita === 0) continue;

    taglie.push({
      numero: i,
      nome: nomeTaglia,
      field: pField,
      quantita,
    });
  }

  return (
    <div className="grid grid-cols-10 gap-2">
      {taglie.map(t => (
        <div key={t.field} className="flex flex-col">
          <label className="text-xs text-gray-600">{t.nome}</label>
          {readonly ? (
            <div className="border rounded px-2 py-1">{t.quantita}</div>
          ) : (
            <input
              type="number"
              min="0"
              value={t.quantita}
              onChange={(e) => onChange?.(t.field, parseInt(e.target.value) || 0)}
              className="border rounded px-2 py-1"
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

**Key Points:**
- ✅ Loop 1-20 per generare campi
- ✅ Nomi taglie da numerata (n01-n20)
- ✅ Fallback "T1", "T2"... se non c'è numerata
- ✅ Readonly mode (nasconde qta=0)
- ✅ Edit mode con input number

---

### **2. Status Badge Component:**

```tsx
// apps/frontend/src/components/riparazioni/StatusBadge.tsx

interface StatusBadgeProps {
  completa: boolean;
}

export default function StatusBadge({ completa }: StatusBadgeProps) {
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
      completa
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    }`}>
      {completa ? 'Completata' : 'Aperta'}
    </span>
  );
}
```

---

## 🔗 **SIDEBAR NAVIGATION**

Aggiungi link in `components/layout/Sidebar.tsx`:

```tsx
{
  id: 'riparazioni',
  label: 'Riparazioni',
  icon: 'fa-wrench',
  href: '/riparazioni',
  permission: 'riparazioni',
  submenu: [
    { label: 'Dashboard', href: '/riparazioni', icon: 'fa-home' },
    { label: 'Nuova Riparazione', href: '/riparazioni/create', icon: 'fa-plus' },
    { label: 'Archivio', href: '/riparazioni/list', icon: 'fa-list' },
    { label: 'Riparazioni Interne', href: '/riparazioni/interne', icon: 'fa-hospital' },
  ],
},
```

---

## 📄 **PDF GENERATION (Opzionale)**

Se vuoi implementare la generazione PDF Cedola:

### **Backend Job Handler:**

```typescript
// apps/backend/src/modules/jobs/handlers/riparazioni.cedola-pdf.ts

import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';

const handler: JobHandler = async (payload, helpers) => {
  const { id, userId, jobId } = payload;
  const { riparazioniService, ensureOutputPath, waitForPdf } = helpers;

  const riparazione = await riparazioniService.findOne(id);
  const fileName = `cedola_${riparazione.idRiparazione}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Header con barcode Code39
  doc.fontSize(20).text('CEDOLA DI RIPARAZIONE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`ID: ${riparazione.idRiparazione}`, { align: 'center' });

  // Barcode placeholder (implementa con libreria barcode)
  doc.moveDown(2);

  // Info riparazione
  doc.fontSize(10);
  doc.text(`Cartellino: ${riparazione.cartellino}`);
  doc.text(`Laboratorio: ${riparazione.laboratorio?.nome || '-'}`);
  doc.text(`Reparto: ${riparazione.reparto?.nome || '-'}`);

  // Griglia taglie
  doc.moveDown();
  doc.fontSize(12).text('Taglie:', { underline: true });

  // Table header 20 colonne
  // ... implementa griglia come Export

  // Causale
  doc.moveDown();
  doc.fontSize(10);
  doc.text('Causale:');
  doc.text(riparazione.causale || '', { indent: 20 });

  await waitForPdf(doc, fullPath);
  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size)
  };
};

export default handler;
```

**Registra handler in `handlers/index.ts`:**
```typescript
'riparazioni.cedola-pdf': require('./riparazioni.cedola-pdf').default,
```

---

## 🎨 **COLOR SCHEME**

Usa questi colori per consistenza:

- **Primary:** Purple (`bg-purple-500`)
- **Aperta:** Orange (`bg-orange-100 text-orange-800`)
- **Completata:** Green (`bg-green-100 text-green-800`)
- **Danger:** Red (`bg-red-500`)

---

## ✅ **CHECKLIST IMPLEMENTAZIONE**

### **Fase 1: Setup Base**
- [ ] Creare directory `apps/frontend/src/app/(dashboard)/riparazioni/`
- [ ] Creare `page.tsx` (Home)
- [ ] Aggiungere link in Sidebar
- [ ] Testare navigazione

### **Fase 2: Lista**
- [ ] Creare `list/page.tsx`
- [ ] Implementare filtri (2 righe)
- [ ] Tabella con @tanstack/react-table
- [ ] Pagination
- [ ] Status badges

### **Fase 3: Creazione**
- [ ] Creare `create/page.tsx`
- [ ] Step 1: Input cartellino
- [ ] Step 2: Form con griglia taglie
- [ ] Fetch support data (reparti, laboratori, linee, numerate)
- [ ] Auto-generate idRiparazione
- [ ] Submit e redirect

### **Fase 4: Dettaglio**
- [ ] Creare `[id]/page.tsx`
- [ ] Display info riparazione
- [ ] Griglia taglie readonly
- [ ] Actions bar (Edit, Complete, Delete)
- [ ] Modale conferma completamento

### **Fase 5: Riparazioni Interne**
- [ ] Duplicare struttura in `interne/`
- [ ] Adattare form (no laboratorio, + repartoOrigine/Destino)
- [ ] Campo foto (upload opzionale)
- [ ] operatoreApertura/Chiusura

### **Fase 6: Polish**
- [ ] Animazioni Framer Motion
- [ ] Dark mode completo
- [ ] Loading states
- [ ] Error handling
- [ ] Toast notifications
- [ ] Validazioni client-side

### **Fase 7: PDF (Opzionale)**
- [ ] Implementare job handler
- [ ] Registrare in handlers/index.ts
- [ ] Pulsante "Genera Cedola"
- [ ] Download tracking

---

## 🚨 **IMPORTANTE**

### **NON DIMENTICARE:**

1. **Fetch Numerata per nomi taglie:**
   ```tsx
   const numerata = await riparazioniApi.getNumerata(riparazione.numerataId);
   ```

2. **Calcolo qtaTotale client-side:**
   ```tsx
   const qtaTotale = Object.keys(values)
     .filter(k => k.startsWith('p'))
     .reduce((sum, k) => sum + (values[k] || 0), 0);
   ```

3. **Validazione prima submit:**
   ```tsx
   if (qtaTotale === 0) {
     showError('Inserisci almeno una quantità');
     return;
   }
   ```

4. **Dark mode su TUTTO:**
   - Usa sempre `dark:` variants Tailwind
   - Testa con toggle tema

5. **Loading states:**
   ```tsx
   const [loading, setLoading] = useState(false);

   if (loading) return <LoadingSpinner />;
   ```

---

## 📚 **RIFERIMENTI CODICE**

**Copia pattern da questi file:**
- Home: `apps/frontend/src/app/(dashboard)/export/page.tsx`
- Lista: `apps/frontend/src/app/(dashboard)/export/archive/page.tsx`
- Creazione: `apps/frontend/src/app/(dashboard)/export/create/page.tsx`
- Dettaglio: `apps/frontend/src/app/(dashboard)/export/[progressivo]/page.tsx`

---

## 🎯 **OBIETTIVO FINALE**

Il modulo Riparazioni deve essere:
- ✅ **Identico in stile** al modulo Export
- ✅ **Funzionale** come il legacy CoreGRE
- ✅ **Migliore UX** con animazioni e design moderno
- ✅ **Dark mode** completo
- ✅ **Responsive** mobile-friendly
- ✅ **Performance** ottimizzate

---

## 🤝 **SUPPORTO**

Per qualsiasi dubbio:
1. Guarda il codice del modulo Export
2. Controlla la documentazione API (`riparazioniApi` in `lib/api.ts`)
3. Verifica lo schema Prisma (`apps/backend/prisma/schema.prisma`)

**Buon lavoro!** 🚀
