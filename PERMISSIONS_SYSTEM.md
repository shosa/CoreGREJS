# Sistema Permessi CoreGREJS

## Panoramica

Il sistema di permessi di CoreGREJS implementa un controllo degli accessi basato su moduli a livello backend e frontend.

## Architettura

### Database

**Tabella: `auth_permissions`**
- Campo `id_utente`: riferimento univoco all'utente
- Campo `permessi`: JSON con chiavi per ogni modulo

Esempio struttura JSON:
```json
{
  "riparazioni": true,
  "produzione": false,
  "quality": true,
  "export": true,
  "scm_admin": true,
  "tracking": true,
  "mrp": false,
  "users": true,
  "settings": true,
  "log": true,
  "etichette": false,
  "dbsql": false,
  "admin": false
}
```

### Backend

#### 1. Decorator `@RequirePermissions`

**File**: `src/common/decorators/permissions.decorator.ts`

Utilizzato per specificare i permessi richiesti per un endpoint:

```typescript
@RequirePermissions('riparazioni')
@Get()
async findAll() { ... }
```

Supporta permessi multipli (logica OR):

```typescript
@RequirePermissions('riparazioni', 'produzione')
```

#### 2. Guard `PermissionsGuard`

**File**: `src/common/guards/permissions.guard.ts`

**Funzionalità:**
- Legge i permessi richiesti dal decorator
- Estrae l'utente dalla richiesta JWT
- Query al database per ottenere i permessi attuali dell'utente
- Verifica automatica per utenti con `adminType === 'admin'` (accesso completo)
- Logica OR: l'utente deve avere almeno UNO dei permessi richiesti
- Lancia `ForbiddenException` se l'accesso è negato

**Flusso:**
```
Request → JwtAuthGuard → PermissionsGuard → Controller
            ↓               ↓
        Valida JWT    Query permessi DB
                      Verifica accesso
```

#### 3. Applicazione ai Controller

Ogni controller protetto deve includere:

```typescript
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('riparazioni')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('riparazioni')
export class RiparazioniController { ... }
```

**Controller Protetti:**
- ✅ RiparazioniController - permesso: `riparazioni`
- ✅ ExportController - permesso: `export`
- ✅ ProduzioneController - permesso: `produzione`
- ✅ TrackingController - permesso: `tracking`
- ✅ SettingsController - permesso: `settings`
- ✅ UsersController - permesso: `users`

### Frontend

#### 1. Zustand Store

**File**: `src/store/auth.ts`

**Metodo `hasPermission`:**
```typescript
hasPermission: (module: string) => {
  const { user } = get();
  if (!user) return false;
  if (user.adminType === 'admin') return true;  // Admin bypass
  return user.permissions?.[module] === true;
}
```

**Utilizzo nei componenti:**
```typescript
const { hasPermission } = useAuthStore();

if (hasPermission('riparazioni')) {
  // Mostra UI per riparazioni
}
```

#### 2. Sidebar Navigation

**File**: `src/components/layout/Sidebar.tsx`

Ogni voce di menu ha un campo `permission`:

```typescript
{
  name: 'Riparazioni',
  href: '/riparazioni',
  icon: 'fa-hammer',
  permission: 'riparazioni',
}
```

Le voci vengono filtrate automaticamente in base ai permessi dell'utente.

#### 3. Pagina Gestione Permessi

**File**: `src/app/(dashboard)/users/[id]/permissions/page.tsx`

**Funzionalità:**
- Visualizzazione permessi utente con card colorate
- Toggle switch per abilitare/disabilitare permessi
- Selezione/deselezione massiva
- Salvataggio tramite API

**Endpoint API:**
- `GET /api/users/:id/permissions` - Recupera permessi
- `PUT /api/users/:id/permissions` - Aggiorna permessi

## Moduli Disponibili

| Chiave | Nome | Descrizione |
|--------|------|-------------|
| `riparazioni` | Riparazioni | Gestione riparazioni esterne |
| `produzione` | Produzione | Gestione produzione |
| `quality` | Controllo Qualità | QC e controllo qualità |
| `export` | Export | Gestione DDT ed export |
| `scm_admin` | SCM | Supply Chain Management |
| `tracking` | Tracking | Tracciabilità materiali |
| `mrp` | MRP | Material Requirements Planning |
| `users` | Utenti | Gestione utenti |
| `settings` | Impostazioni | Configurazioni sistema |
| `log` | Log Attività | Visualizzazione log |
| `etichette` | Etichette DYMO | Stampa etichette |
| `dbsql` | Database SQL | Accesso database e migrazioni |
| `admin` | Admin | Privilegi amministratore |

## Tipi Utente

**Campo `adminType`:**
- `admin` - Accesso completo a tutti i moduli (bypass permessi)
- `manager` - Manager con permessi personalizzati
- `operator` - Operatore con permessi limitati
- `user` - Utente base
- `viewer` - Solo visualizzazione

## Comportamento Speciale

### Utenti Admin

Gli utenti con `adminType === 'admin'` hanno accesso completo:
- Bypass del sistema permessi a livello backend
- Bypass del sistema permessi a livello frontend
- Possono gestire permessi di altri utenti

### Permessi Predefiniti

**Utente Admin (seed.ts):**
Tutti i permessi attivi di default.

**Utenti Normali:**
Tutti i permessi disattivi di default.

## API Endpoints Permessi

### GET /api/users/:id/permissions

Recupera i permessi di un utente.

**Response:**
```json
{
  "id": 1,
  "userId": 5,
  "permessi": {
    "riparazioni": true,
    "produzione": false,
    ...
  }
}
```

### PUT /api/users/:id/permissions

Aggiorna i permessi di un utente.

**Request Body:**
```json
{
  "riparazioni": true,
  "produzione": true,
  "quality": false,
  ...
}
```

## Sicurezza

### Multi-Layer Protection

1. **Frontend Validation**: Nasconde UI non autorizzata
2. **Backend Validation**: Blocca richieste API non autorizzate
3. **Real-Time Checks**: Permessi verificati ad ogni richiesta (non cached in JWT)

### Best Practices

- ✅ Permessi verificati in tempo reale dal database
- ✅ Nessun caching di permessi nel token JWT
- ✅ Guard applicati a livello di controller
- ✅ Exception chiare in caso di accesso negato
- ✅ Admin bypass per manutenzione sistema

## Testing

### Test Manuale

1. Creare utente non-admin
2. Disabilitare tutti i permessi
3. Verificare che le voci menu siano nascoste
4. Tentare accesso diretto via API (deve fallire con 403)
5. Abilitare singolo permesso
6. Verificare che solo quel modulo sia accessibile

### Test Utente Admin

1. Login come admin
2. Verificare accesso completo a tutti i moduli
3. Verificare che il guard non blocchi nessuna richiesta

## Estensione Sistema

### Aggiungere Nuovo Modulo

1. **Database**: Aggiungere chiave nel JSON dei permessi predefiniti
2. **Backend**: Creare controller con `@RequirePermissions('nuovo_modulo')`
3. **Frontend**: Aggiungere voce in `permissionsList` nella pagina permessi
4. **Sidebar**: Aggiungere `permission: 'nuovo_modulo'` alla voce menu

### Esempio Nuovo Modulo "Magazzino"

**Backend Controller:**
```typescript
@Controller('magazzino')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('magazzino')
export class MagazzinoController { ... }
```

**Frontend Permissions Page:**
```typescript
{
  key: 'magazzino',
  name: 'Magazzino',
  icon: 'fa-warehouse',
  color: 'purple',
  description: 'Gestione magazzino e inventario'
}
```

**Sidebar:**
```typescript
{
  name: 'Magazzino',
  href: '/magazzino',
  icon: 'fa-warehouse',
  permission: 'magazzino',
}
```

## Troubleshooting

### Errore 403 Forbidden

**Causa**: Utente non ha il permesso richiesto

**Soluzione**:
1. Verificare permessi utente in `/users/:id/permissions`
2. Abilitare il permesso necessario
3. Verificare che il tipo utente non sia bloccato

### Menu Vuoto

**Causa**: Utente non ha permessi attivi

**Soluzione**:
1. Verificare che l'utente abbia almeno un permesso attivo
2. Verificare che il login abbia restituito i permessi corretti
3. Controllare lo store Zustand

### Admin Non Bypassa

**Causa**: Campo `adminType` non è 'admin'

**Soluzione**:
1. Verificare campo `admin_type` in database
2. Aggiornare utente con `adminType = 'admin'`

## File Principali

```
backend/
├── src/common/
│   ├── decorators/
│   │   └── permissions.decorator.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── permissions.guard.ts
├── src/modules/
│   ├── auth/
│   │   └── auth.service.ts
│   └── users/
│       ├── users.controller.ts
│       └── users.service.ts
└── prisma/
    └── schema.prisma

frontend/
├── src/store/
│   └── auth.ts
├── src/app/(dashboard)/
│   └── users/[id]/permissions/
│       └── page.tsx
└── src/components/layout/
    └── Sidebar.tsx
```

## Changelog

### v1.0.0 - 2025-01-05
- ✅ Implementato PermissionsGuard
- ✅ Creato decorator @RequirePermissions
- ✅ Applicati guard a tutti i controller principali
- ✅ Sistema funzionante con controlli backend e frontend
