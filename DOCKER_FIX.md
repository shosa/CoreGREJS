# Docker Storage Fix - CoreGREJS

## Problemi Risolti

### 1. Persistenza Storage Backend
**Problema**: I file caricati in `storage/export/src/{progressivo}` non persistevano al riavvio del container.

**Soluzione**: Aggiunto volume mapping in `docker-compose.yml`:
```yaml
volumes:
  - ./volumes/backend/storage/export:/app/storage/export
  - ./volumes/backend/storage/jobs:/app/storage/jobs
  - ./volumes/backend/storage/uploads:/app/storage/uploads
  - ./volumes/backend/storage/logs:/app/storage/logs
```

I file verranno ora salvati su host in `CoreGREJS/volumes/backend/storage/`.

### 2. Accesso Immagini per PDF
**Problema**: Il backend non poteva accedere a `apps/frontend/public/assets/small_logo.png` per generare PDF (segnacolli, report, ecc.) perché frontend e backend sono container separati.

**Soluzione**: Modificato `apps/backend/Dockerfile`:
- Copiato `apps/frontend/public` nel container backend
- Le immagini sono ora disponibili in `/app/public/assets/` nel container backend

## Deploy in Produzione

### ⚠️ IMPORTANTE: Inizializza i Volumi Prima del Deploy

I volumi Docker devono essere creati **prima** di avviare i container, altrimenti il mount sovrascrive le directory create nel Dockerfile.

#### Su Linux/Mac:
```bash
cd CoreGREJS

# 1. Inizializza volumi (crea directory structure + permessi)
chmod +x init-volumes.sh
./init-volumes.sh
```

#### Su Windows:
```bash
cd CoreGREJS

# 1. Inizializza volumi (crea directory structure)
init-volumes.bat
```

### 2. Rebuild e Avvio Container
```bash
# Stop containers (se già running)
docker-compose down

# Rebuild images
docker-compose build --no-cache

# Start containers
docker-compose up -d
```

### 3. Verifica Volumi Creati
```bash
# Check volume directories
ls -la volumes/backend/storage/

# Should show:
# - export/temp/
# - export/src/
# - jobs/
# - uploads/
# - logs/
```

### 4. Verifica Logs Container
```bash
# Check backend started correctly
docker logs coregrejs-backend

# Should NOT show: "EACCES: permission denied, mkdir '/app/storage/export/temp'"
```

### 5. Fix Permessi (solo se errori)
Se vedi ancora errori di permessi:
```bash
# Set ownership to container user (UID 1001 = nestjs)
sudo chown -R 1001:1001 volumes/backend/storage/

# Restart container
docker-compose restart backend
```

### 6. Test Funzionalità

#### Test Export Storage
1. Vai su Export → Documenti → Apri un DDT
2. Carica un file Excel (scheda)
3. Verifica che il file sia salvato in `volumes/backend/storage/export/src/{progressivo}/`

#### Test PDF con Immagini
1. Genera un Segnacolli PDF da un DDT
2. Verifica che il PDF contenga il logo aziendale
3. Il file sarà in `volumes/backend/storage/jobs/`

## Rollback (se necessario)
```bash
# Tornare alla versione precedente
git checkout HEAD~1 docker-compose.yml apps/backend/Dockerfile

# Rebuild
docker-compose down
docker-compose build
docker-compose up -d
```

## Note
- La directory `volumes/` è ignorata da git (vedi `.gitignore`)
- I dati persistono tra restart e rebuild dei container
- Per backup: copia l'intera directory `volumes/backend/storage/`
