# CoreGREJS

CoreGRE ERP System - Versione Node.js/TypeScript

## Stack Tecnologico

- **Backend**: NestJS 10.3 + Prisma 5.22
- **Frontend**: Next.js 14.2 + Tailwind CSS
- **Database**: MySQL 8.0
- **Auth**: JWT + Passport

## Quick Start

### Sviluppo locale

```bash
# Installa dipendenze
npm install

# Configura database (crea .env in apps/backend)
cp apps/backend/.env.example apps/backend/.env
# Modifica DATABASE_URL con le tue credenziali

# Genera Prisma client
npm run db:generate

# Esegui migrazioni
npm run db:migrate

# Seed database
npm run db:seed

# Avvia in sviluppo
npm run dev
```

### Docker

```bash
# Crea network se non esiste
docker network create core-network

# Avvia tutti i servizi
docker-compose up -d

# Esegui migrazioni e seed
docker exec coregre-backend npx prisma migrate deploy
docker exec coregre-backend npx prisma db seed
```

## Accesso

- **Frontend**: http://localhost:3010
- **Backend API**: http://localhost:3011/api
- **API Docs**: http://localhost:3011/api/docs

### Utenti Default

- **Admin**: admin / admin123
- **Operatore**: operatore / operator123

## Struttura Progetto

```
CoreGREJS/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── modules/  # Moduli funzionali
│   │   │   ├── prisma/   # Database service
│   │   │   └── common/   # Guards, filters, etc.
│   │   └── prisma/       # Schema e migrazioni
│   │
│   └── frontend/         # Next.js App
│       └── src/
│           ├── app/      # Pages e layouts
│           ├── components/
│           ├── lib/      # API client
│           └── store/    # Zustand stores
│
├── docker-compose.yml
└── package.json
```

## Moduli

I seguenti moduli sono placeholder e verranno implementati progressivamente:

- [ ] Riparazioni
- [ ] Quality Control
- [ ] Produzione
- [ ] Export/DDT
- [ ] SCM Admin
- [ ] Tracking
- [ ] MRP
- [ ] Settings
- [ ] System
- [ ] Notifications
- [ ] Cron Jobs
