# CoreGRE Mobile

PWA mobile per Quality Control e Riparazioni Interne.

## 🚀 Stack Tecnologico

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling utility-first
- **Zustand** - State management
- **next-pwa** - Progressive Web App support
- **Axios** - HTTP client

## 📦 Installazione

```bash
# Dalla root del monorepo
npm install

# Solo mobile
cd apps/mobile
npm install
```

## 🛠️ Sviluppo

```bash
# Avvia backend + frontend + mobile
npm run dev

# Solo mobile (porta 3012)
npm run dev:mobile
```

L'app sarà disponibile su: http://localhost:3012

## 🏗️ Build

```bash
# Build di tutte le app
npm run build

# Solo mobile
npm run build:mobile
```

## 🚀 Produzione

```bash
# Avvia tutte le app
npm run start

# Solo mobile
npm run start:mobile
```

## 📱 PWA Features

- ✅ Installabile su dispositivi mobili
- ✅ Funziona offline (service worker)
- ✅ Ottimizzato per touch
- ✅ Manifest configurato
- ✅ Icons 192x192 e 512x512

## 🔧 Configurazione

### Variabili d'Ambiente

Crea `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3011/api
```

### PWA

Il PWA è disabilitato in development per facilitare il debug.
In production, il service worker viene automaticamente registrato.

## 📂 Struttura

```
apps/mobile/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── layout.tsx    # Layout root
│   │   ├── page.tsx      # Home redirect
│   │   ├── login/        # Login page
│   │   ├── menu/         # Main menu
│   │   ├── quality/      # Quality module (TODO)
│   │   └── repairs/      # Repairs module (TODO)
│   ├── components/       # Componenti riutilizzabili
│   ├── lib/              # Utilities
│   │   └── api.ts        # API client
│   ├── store/            # Zustand stores
│   │   └── auth.ts       # Auth store
│   └── types/            # TypeScript types
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   ├── icon-192x192.png  # App icon
│   └── icon-512x512.png  # App icon large
├── next.config.js        # Next.js + PWA config
├── tailwind.config.js    # Tailwind config
└── tsconfig.json         # TypeScript config
```

## 🔐 Autenticazione

L'app usa il sistema di autenticazione mobile del backend:

1. Carica lista operatori da `/api/mobile/users`
2. Login con matricola e PIN via `/api/mobile/login`
3. Store user data in Zustand + localStorage
4. Header `X-Mobile-User` per richieste autenticate

## 🎨 UI/UX Mobile-First

### Utility Classes Custom

```tsx
// Buttons
<button className="btn-mobile btn-primary">...</button>
<button className="btn-mobile btn-secondary">...</button>

// Inputs
<input className="input-mobile" />

// Cards
<div className="card-mobile">...</div>

// Top Bar
<div className="top-bar-mobile">...</div>
```

### Safe Area Support

```tsx
<div className="safe-top safe-bottom">
  {/* Content rispetta notch e barre iOS/Android */}
</div>
```

## 📡 API Integration

### Mobile API

```typescript
import { mobileApi } from '@/lib/api';

// Login
const response = await mobileApi.login(username, pin, 'quality');

// System data
const data = await mobileApi.getSystemData('all');

// Check cartellino
const result = await mobileApi.checkData('cartellino', '12345');
```

### Quality API

```typescript
import { qualityApi } from '@/lib/api';

// Check cartellino
const data = await qualityApi.checkCartellino('12345');

// Save quality control
await qualityApi.saveHermesCq({...});

// Upload photo
await qualityApi.uploadPhoto(formData);
```

### Repairs API

```typescript
import { repairsApi } from '@/lib/api';

// Get repairs
const repairs = await repairsApi.getRiparazioni({
  page: 1,
  limit: 20,
  completa: false
});

// Create repair
await repairsApi.createRiparazione(data);

// Generate PDF
const pdfUrl = await repairsApi.generatePDF(id);
```

## 🎯 Moduli

### ✅ Completati

- [x] Setup progetto
- [x] Login system
- [x] Main menu
- [x] API integration
- [x] PWA configuration

### 🚧 Da Migrare

- [ ] Quality Control Module
  - [ ] Insert Quality
  - [ ] Quality Control form
  - [ ] Exception modal
  - [ ] Daily Summary
- [ ] Repairs Module
  - [ ] List Repairs
  - [ ] Create Repair
  - [ ] Close Repair
  - [ ] Repair Details

## 🔄 Migrazione da CoreInWork

### Differenze Principali

| CoreInWork (Old) | CoreGRE Mobile (New) |
|------------------|----------------------|
| React CRA | Next.js 14 |
| JavaScript | TypeScript |
| Ionic Components | Tailwind + HTML |
| Capacitor | Pure PWA |
| State in useState | Zustand store |
| Manual routing | Next.js Router |
| localStorage manual | Zustand persist |

### Vantaggi

- ✅ Nessuna dipendenza da Capacitor/Ionic
- ✅ Build più veloci
- ✅ Bundle size ridotto
- ✅ Type safety con TypeScript
- ✅ Routing automatico con Next.js
- ✅ Stessa infrastruttura del frontend principale
- ✅ PWA nativo con next-pwa

## 📝 TODO Next Steps

1. Migrare componenti Quality Control
2. Migrare componenti Repairs
3. Aggiungere icons PWA personalizzati
4. Test E2E
5. Deploy su server production

## 🐛 Debug

### Service Worker Issues

```bash
# Cancella cache e service worker
# Chrome DevTools > Application > Clear storage
```

### API Connection Issues

Verifica che il backend sia attivo su `localhost:3011`:

```bash
npm run dev:backend
```

## 📚 Documentazione

- [Next.js App Router](https://nextjs.org/docs/app)
- [Zustand](https://docs.pmnd.rs/zustand)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 👨‍💻 Sviluppo

Stefano - CoreGRE Team
