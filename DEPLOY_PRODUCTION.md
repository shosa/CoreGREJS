# 🚀 Deploy Produzione - CoreGREJS

## Quick Start (Prima volta o dopo modifiche Docker)

### Server Linux (SSH)
```bash
# 1. SSH nel server
ssh user@your-server

# 2. Vai nella directory del progetto
cd /path/to/CoreGREJS

# 3. Pull ultime modifiche (se da git)
git pull origin main

# 4. IMPORTANTE: Inizializza volumi
chmod +x init-volumes.sh
./init-volumes.sh

# 5. Rebuild e avvia
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 6. Verifica logs
docker logs -f coregrejs-backend
```

### Server Windows
```bash
# 1. Vai nella directory
cd C:\path\to\CoreGREJS

# 2. Inizializza volumi
init-volumes.bat

# 3. Rebuild e avvia
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Verifica
docker logs coregrejs-backend
```

---

## 🔍 Troubleshooting

### Errore: "EACCES: permission denied, mkdir '/app/storage/export/temp'"

**Causa**: Volumi non inizializzati o permessi errati.

**Fix**:
```bash
# Stop containers
docker-compose down

# Rimuovi volumi (ATTENZIONE: perderai i dati!)
rm -rf volumes/

# Reinizializza
./init-volumes.sh

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Errore: "Cannot load logo" nei PDF

**Causa**: Immagini frontend non copiate nel container backend.

**Fix**: Verifica che il Dockerfile backend includa:
```dockerfile
COPY --from=builder --chown=nestjs:nodejs /app/apps/frontend/public ./public
```

Rebuild: `docker-compose build --no-cache backend`

### Container non si avvia

```bash
# Check logs dettagliati
docker logs coregrejs-backend --tail 100

# Check se porta 3011 è occupata
netstat -tulpn | grep 3011  # Linux
netstat -ano | findstr :3011  # Windows

# Riavvia forzato
docker-compose down -v
docker-compose up -d
```

---

## 📂 Struttura Volumi Persistenti

```
CoreGREJS/volumes/backend/storage/
├── export/
│   ├── temp/         # Upload temporanei Excel
│   └── src/          # Schede elaborate per DDT
│       └── {progressivo}/  # Es: 1234/
│           └── *.xlsx
├── jobs/             # PDF/Excel generati da job queue
│   └── {userId}/
│       └── {jobId}/
│           └── *.pdf
├── uploads/          # Altri upload
└── logs/             # Application logs
```

---

## ✅ Checklist Post-Deploy

- [ ] Backend avviato: `curl http://localhost:3011/api/health`
- [ ] Frontend avviato: `curl http://localhost:3010`
- [ ] Volumi creati: `ls volumes/backend/storage/export/`
- [ ] Permessi OK: `ls -la volumes/backend/storage/`
- [ ] Test upload scheda: Export → DDT → Carica Excel
- [ ] Test PDF con logo: Export → Segnacolli PDF

---

## 🔄 Update Routine (senza rebuild)

Se modifichi solo **codice TypeScript** (non Dockerfile/docker-compose.yml):

```bash
# Pull codice
git pull

# Restart senza rebuild (più veloce)
docker-compose restart
```

Se modifichi **Dockerfile** o **docker-compose.yml**:

```bash
# Full rebuild necessario
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 💾 Backup Storage

```bash
# Backup directory volumi
tar -czf backup-storage-$(date +%Y%m%d).tar.gz volumes/backend/storage/

# Restore
tar -xzf backup-storage-20251210.tar.gz
```

---

## 🗑️ Cleanup (libera spazio)

```bash
# Rimuovi container, network, volumi anonimi
docker-compose down -v

# Rimuovi immagini vecchie
docker image prune -a

# Rimuovi tutto (ATTENZIONE!)
docker system prune -a --volumes
```
