# CoreGREJS - Regole e Note di Sviluppo

## STATO ATTUALE: Modulo TRACKING COMPLETATO (21/11/2024)

### Cosa e stato fatto:
- Schema Prisma ALLINEATO al Legacy (track_links, track_types, track_lots_info, track_order_info, track_sku)
- Backend completo con tutti i 24 endpoint Legacy
- Frontend con tutte le 6 pagine principali + reports

### PAGINE FRONTEND IMPLEMENTATE:
1. **/tracking** - Dashboard con 4 stats + 5 navigation cards
2. **/tracking/multi-search** - Ricerca avanzata (7 filtri) - risultati raggruppati per modello con paia, Footer con totali selezionati
3. **/tracking/order-search** - Input singolo con verifica ad ogni invio, cards valide/non valide, Footer con riepilogo
4. **/tracking/process-links** - Step finale: selezione Tipo + inserimento Lotti (textarea)
5. **/tracking/tree-view** - Albero gerarchico Cartellino > Tipo > Lotti con edit/delete inline
6. **/tracking/lot-detail** - 3 TAB (Lotti senza DDT, Ordini senza date, Articoli senza SKU) + Offcanvas per completati
7. **/tracking/reports** - Report PDF/Excel per lotti e cartellini + Fiches

### COMPONENTI UI RIUTILIZZABILI:
```
apps/frontend/src/components/
├── layout/
│   ├── PageHeader.tsx     - Header pagina con titolo e sottotitolo
│   ├── Breadcrumb.tsx     - Navigazione breadcrumb
│   ├── Footer.tsx         - Footer fisso con prop `show` per animazione entrata/uscita
│   └── Topbar.tsx         - Barra superiore applicazione
├── ui/
│   ├── Offcanvas.tsx      - Pannello laterale riutilizzabile con:
│   │   - Props: open, onClose, title, icon, iconColor, headerBg
│   │   - Props: children, footer, width (sm|md|lg|xl|2xl), position (left|right)
│   │   - Props: searchValue, onSearchChange, searchPlaceholder, loading
│   │   - Z-index: backdrop z-[1000], panel z-[1001]
│   └── ...
```

### PATTERN UI COMUNI:
- **Footer con riepilogo**: Usa `<Footer show={condition}>` per mostrare conteggi e azioni
- **Offcanvas con ricerca**: Usa `<Offcanvas searchValue={...} onSearchChange={...}>` per filtri integrati
- **Cards valide/non valide**: Verde (bg-green-50) per validi, Rosso (bg-red-50) per non validi
- **Totale paia**: Sempre in blu (text-blue-600) con font-semibold
- **Focus automatico**: useEffect su loading per riportare focus dopo operazioni async

### BACKEND ENDPOINTS IMPLEMENTATI:
```
GET  /tracking/stats - Dashboard stats (4 contatori)
GET  /tracking/types - Lista tipi tracking
POST /tracking/types - Crea nuovo tipo
POST /tracking/search-data - Ricerca cartellini con 7 filtri (ritorna anche `paia`)
POST /tracking/check-cartel - Verifica cartellino (ritorna anche `paia`)
POST /tracking/save-links - Salva collegamenti {typeId, lots[], cartelli[]}
GET  /tracking/tree-data - Carica albero (search, page, limit)
PUT  /tracking/update-lot/:id - Modifica lotto
DELETE /tracking/delete-lot/:id - Elimina collegamento
GET  /tracking/lots-without-ddt - Tab1: Lotti senza DDT
GET  /tracking/orders-without-date - Tab2: Ordini senza date
GET  /tracking/articles-without-sku - Tab3: Articoli senza SKU
POST /tracking/update-lot-info - Aggiorna info lotto (DDT/date/note)
POST /tracking/update-order-info - Aggiorna data ordine
POST /tracking/update-sku - Aggiorna SKU articolo
GET  /tracking/search-lot-details - Dettagli lotto
GET  /tracking/search-order-details - Dettagli ordine
GET  /tracking/search-articolo-details - Dettagli articolo (SKU)
POST /tracking/load-summary - Riepilogo per report
POST /tracking/report-*-pdf|excel - Report (placeholder, da implementare con PDFKit/ExcelJS)
```

### TABELLE DB (Schema Prisma allineato al Legacy):
```prisma
TrackLink: id, cartel (INT), typeId, lot (VARCHAR), note, timestamp
TrackType: id, name, note
TrackLotInfo: lot (PK string), doc, date, note
TrackOrderInfo: id, ordine, date
TrackSku: art (PK string), sku
```

### FLUSSO PRINCIPALE:
1. Dashboard -> Multisearch -> Seleziona cartellini -> ProcessLinks -> Scegli Tipo + Lotti -> Salva
2. Dashboard -> Ordersearch -> Inserisci manualmente -> ProcessLinks -> Salva
3. Dashboard -> TreeView -> Cerca ("*" per tutto) -> Visualizza/Modifica/Elimina
4. Dashboard -> LotDetail -> Compila metadati mancanti
5. Dashboard -> Reports -> Genera PDF/Excel

### COSA RESTA DA FARE:
- [ ] Implementare generazione PDF con PDFKit (report-*-pdf)
- [ ] Implementare generazione Excel con ExcelJS (report-*-excel)
- [ ] Testare flusso completo su dati reali

## CORE_DATI (Struttura Legacy - 21/11/2024)
Schema allineato alla struttura Legacy con tutte le colonne:
```
St, Ordine, Rg, CCli, Ragione Sociale, Cartel (UNIQUE), Commessa Cli, PO,
Articolo, Descrizione Articolo, Nu, Marca Etich, Ln,
P01-P20 (taglie), Tot
```

## IMPORT EXCEL (Impostazioni)
- **Backend**: apps/backend/src/modules/settings/
- **Frontend**: apps/frontend/src/app/(dashboard)/settings/
- Preserva cartellini gia collegati in track_links
- Formato: .xlsx con colonne nell'ordine Legacy esatto

## STACK TECNOLOGICO
- Backend: NestJS 10 + Prisma + MySQL
- Frontend: Next.js 14 App Router + Tailwind + Framer Motion
- Report: PDFKit + ExcelJS (gia installati)
- Auth: JWT con JwtAuthGuard

## FILE CHIAVE:
- Backend: apps/backend/src/modules/tracking/ e settings/
- Frontend: apps/frontend/src/app/(dashboard)/tracking/ e settings/
- Prisma: apps/backend/prisma/schema.prisma
- API Client: apps/frontend/src/lib/api.ts
- Componenti UI: apps/frontend/src/components/ui/ e layout/
