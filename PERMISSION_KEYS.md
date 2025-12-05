# Chiavi Permessi Standardizzate - CoreGREJS

## 📋 Tabella Chiavi Ufficiali

Queste sono le chiavi **UFFICIALI** da usare in tutto il sistema (database, frontend, backend).

| Chiave | Nome Modulo | Sidebar | Backend Controller | Note |
|--------|-------------|---------|-------------------|------|
| `riparazioni` | Riparazioni | ✅ | ✅ RiparazioniController | |
| `produzione` | Produzione | ✅ | ✅ ProduzioneController | |
| `qualita` | Controllo Qualità | ✅ | ⚠️ Non implementato | Solo frontend |
| `export` | Export/DDT | ✅ | ✅ ExportController | |
| `scm_admin` | SCM | ✅ | ⚠️ Non implementato | Solo frontend |
| `tracking` | Tracking | ✅ | ✅ TrackingController | |
| `mrp` | MRP | ✅ | ⚠️ Non implementato | Solo frontend |
| `users` | Gestione Utenti | ✅ | ✅ UsersController | |
| `settings` | Impostazioni | ✅ | ✅ SettingsController | |
| `log` | Log Attività | ✅ | ⚠️ Non implementato | Solo frontend |
| `etichette` | Etichette DYMO | ✅ | ⚠️ Non implementato | Solo frontend |
| `dbsql` | Database/SQL | ✅ | ⚠️ Non implementato | Solo frontend |
| `admin` | Admin | - | - | Flag speciale |

## 🔧 File Aggiornati

### Backend

**1. users.service.ts** (Default Permissions)
```typescript
{
  riparazioni: false,
  produzione: false,
  qualita: false,        // ✅ CORRETTO (era "quality")
  export: false,
  scm_admin: false,      // ✅ CORRETTO (era "scm")
  tracking: false,
  mrp: false,
  users: false,          // ✅ CORRETTO (era "utenti")
  log: false,
  etichette: false,
  dbsql: false,
  settings: false,
  admin: false,
}
```

**2. seed.ts** (Admin Default Permissions)
```typescript
const defaultAdminPermissions = {
  riparazioni: true,
  qualita: true,
  produzione: true,
  export: true,
  scm_admin: true,
  tracking: true,
  mrp: true,
  users: true,
  settings: true,
}
```

### Frontend

**1. Sidebar.tsx** (Menu Items)
```typescript
// Già corretto
{ permission: 'riparazioni' }
{ permission: 'qualita' }
{ permission: 'produzione' }
{ permission: 'export' }
{ permission: 'scm_admin' }
{ permission: 'tracking' }
{ permission: 'mrp' }
{ permission: 'users' }
{ permission: 'settings' }
```

**2. permissions/page.tsx** (Permission List)
```typescript
// ✅ AGGIORNATO
{ key: 'qualita' }     // era "quality"
{ key: 'scm_admin' }   // era "scm"
{ key: 'users' }       // era "utenti"
```

## ⚠️ Chiavi DEPRECATE (NON USARE)

| Chiave Vecchia | Chiave Corretta | Status |
|----------------|-----------------|--------|
| `quality` | `qualita` | ❌ Deprecata |
| `scm` | `scm_admin` | ❌ Deprecata |
| `utenti` | `users` | ❌ Deprecata |

## 🔄 Migrazione Dati Esistenti

Se hai già dati nel database con le chiavi vecchie, esegui questo SQL:

```sql
-- Aggiorna le chiavi nei permessi esistenti
UPDATE auth_permissions
SET permessi = JSON_SET(
  JSON_SET(
    JSON_SET(
      permessi,
      '$.qualita', JSON_EXTRACT(permessi, '$.quality')
    ),
    '$.scm_admin', JSON_EXTRACT(permessi, '$.scm')
  ),
  '$.users', JSON_EXTRACT(permessi, '$.utenti')
);

-- Rimuovi le chiavi vecchie
UPDATE auth_permissions
SET permessi = JSON_REMOVE(
  JSON_REMOVE(
    JSON_REMOVE(
      permessi,
      '$.quality'
    ),
    '$.scm'
  ),
  '$.utenti'
);
```

## ✅ Checklist Implementazione

Quando aggiungi un nuovo modulo con permessi:

- [ ] Aggiungi chiave in `users.service.ts` (defaultPermissions)
- [ ] Aggiungi chiave in `seed.ts` (se deve essere attiva per admin)
- [ ] Aggiungi in `Sidebar.tsx` con `permission: 'chiave'`
- [ ] Aggiungi in `permissions/page.tsx` nel `permissionsList`
- [ ] Se ha controller backend, aggiungi `@RequirePermissions('chiave')`
- [ ] Testa che funzioni sia frontend che backend

## 🎯 Naming Convention

**Regola:** Usa il nome **italiano** in minuscolo, con underscore per separare parole.

**Esempi:**
- ✅ `riparazioni`
- ✅ `qualita`
- ✅ `scm_admin`
- ✅ `users` (eccezione: termine comune inglese)
- ❌ `quality` (inglese quando esiste traduzione italiana)
- ❌ `scm` (troppo generico, meglio `scm_admin`)
- ❌ `utenti` (meglio usare `users` per consistenza con auth_users)

## 📊 Status Implementazione

**Completamente Implementati (Backend + Frontend):**
- ✅ riparazioni
- ✅ produzione
- ✅ export
- ✅ tracking
- ✅ settings
- ✅ users

**Solo Frontend:**
- ⚠️ qualita
- ⚠️ scm_admin
- ⚠️ mrp
- ⚠️ log
- ⚠️ etichette
- ⚠️ dbsql

**Prossimi Passi:**
Implementare i controller backend per i moduli con solo frontend protection.
