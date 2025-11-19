-- CreateTable
CREATE TABLE `auth_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_name` VARCHAR(50) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `mail` VARCHAR(100) NULL,
    `admin_type` VARCHAR(20) NOT NULL DEFAULT 'operator',
    `theme_color` VARCHAR(20) NOT NULL DEFAULT 'blue',
    `last_login` DATETIME(3) NULL,
    `expires` DATETIME(3) NULL,
    `remember_token` VARCHAR(255) NULL,
    `series_id` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_users_user_name_key`(`user_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_utente` INTEGER NOT NULL,
    `permessi` JSON NOT NULL,

    UNIQUE INDEX `auth_permissions_id_utente_key`(`id_utente`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `core_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `core_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'string',
    `group` VARCHAR(50) NOT NULL DEFAULT 'general',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `core_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `core_dati` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commessa` VARCHAR(100) NULL,
    `modello` VARCHAR(100) NULL,
    `colore` VARCHAR(100) NULL,
    `forma` VARCHAR(100) NULL,
    `cliente` VARCHAR(200) NULL,
    `stagione` VARCHAR(50) NULL,
    `brand` VARCHAR(100) NULL,
    `data_consegna` DATETIME(3) NULL,
    `quantita` INTEGER NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `core_anag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codice` VARCHAR(50) NULL,
    `nome` VARCHAR(200) NULL,
    `tipo` VARCHAR(50) NULL,
    `indirizzo` VARCHAR(255) NULL,
    `telefono` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `piva` VARCHAR(20) NULL,
    `cf` VARCHAR(20) NULL,
    `note` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rip_riparazioni` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cartellino` VARCHAR(50) NULL,
    `commessa` VARCHAR(100) NULL,
    `modello` VARCHAR(100) NULL,
    `colore` VARCHAR(100) NULL,
    `taglia` VARCHAR(20) NULL,
    `difetto` TEXT NULL,
    `laboratorio_id` INTEGER NULL,
    `reparto_id` INTEGER NULL,
    `linea_id` INTEGER NULL,
    `stato` VARCHAR(20) NOT NULL DEFAULT 'aperta',
    `priorita` INTEGER NOT NULL DEFAULT 0,
    `data_apertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_chiusura` DATETIME(3) NULL,
    `operatore` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rip_interne` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cartellino` VARCHAR(50) NULL,
    `commessa` VARCHAR(100) NULL,
    `modello` VARCHAR(100) NULL,
    `colore` VARCHAR(100) NULL,
    `taglia` VARCHAR(20) NULL,
    `quantita` INTEGER NOT NULL DEFAULT 1,
    `difetto` TEXT NULL,
    `causa_difetto` TEXT NULL,
    `reparto_origine` VARCHAR(100) NULL,
    `reparto_destino` VARCHAR(100) NULL,
    `stato` VARCHAR(30) NOT NULL DEFAULT 'in_attesa',
    `priorita` INTEGER NOT NULL DEFAULT 0,
    `operatore_apertura` VARCHAR(100) NULL,
    `operatore_chiusura` VARCHAR(100) NULL,
    `data_apertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_chiusura` DATETIME(3) NULL,
    `note` TEXT NULL,
    `foto` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rip_reparti` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rip_linee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rip_laboratori` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `indirizzo` VARCHAR(255) NULL,
    `telefono` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cq_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cartellino` VARCHAR(50) NOT NULL,
    `commessa` VARCHAR(100) NULL,
    `modello` VARCHAR(100) NULL,
    `colore` VARCHAR(100) NULL,
    `taglia` VARCHAR(20) NULL,
    `quantita` INTEGER NOT NULL DEFAULT 1,
    `esito` VARCHAR(20) NOT NULL,
    `department_id` INTEGER NULL,
    `operator_id` INTEGER NULL,
    `defect_type_id` INTEGER NULL,
    `note` TEXT NULL,
    `foto` VARCHAR(255) NULL,
    `data_controllo` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cq_departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cq_operators` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `cognome` VARCHAR(100) NULL,
    `matricola` VARCHAR(50) NULL,
    `pin` VARCHAR(10) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cq_operators_matricola_key`(`matricola`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cq_deftypes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `categoria` VARCHAR(50) NULL,
    `gravita` INTEGER NOT NULL DEFAULT 1,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cq_exceptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commessa` VARCHAR(100) NULL,
    `modello` VARCHAR(100) NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `data_inizio` DATETIME(3) NULL,
    `data_fine` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `progressivo` VARCHAR(50) NOT NULL,
    `tipo` VARCHAR(20) NOT NULL DEFAULT 'DDT',
    `terzista_id` INTEGER NULL,
    `data_documento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `stato` VARCHAR(20) NOT NULL DEFAULT 'bozza',
    `note` TEXT NULL,
    `totale_colli` INTEGER NULL,
    `totale_paia` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exp_documents_progressivo_key`(`progressivo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_dati_articoli` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `commessa` VARCHAR(100) NULL,
    `modello` VARCHAR(100) NULL,
    `colore` VARCHAR(100) NULL,
    `taglia` VARCHAR(20) NULL,
    `quantita` INTEGER NOT NULL DEFAULT 0,
    `colli` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_document_footers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `causale` VARCHAR(100) NULL,
    `vettore` VARCHAR(100) NULL,
    `aspetto_beni` VARCHAR(100) NULL,
    `porto` VARCHAR(50) NULL,
    `data_ritiro` DATETIME(3) NULL,
    `ora_ritiro` VARCHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exp_document_footers_document_id_key`(`document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_terzisti` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codice` VARCHAR(50) NULL,
    `nome` VARCHAR(200) NOT NULL,
    `indirizzo` VARCHAR(255) NULL,
    `citta` VARCHAR(100) NULL,
    `cap` VARCHAR(10) NULL,
    `provincia` VARCHAR(5) NULL,
    `telefono` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `piva` VARCHAR(20) NULL,
    `cf` VARCHAR(20) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_missing_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commessa` VARCHAR(100) NULL,
    `campo` VARCHAR(50) NOT NULL,
    `messaggio` TEXT NULL,
    `risolto` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scm_laboratories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codice` VARCHAR(50) NULL,
    `nome` VARCHAR(200) NOT NULL,
    `indirizzo` VARCHAR(255) NULL,
    `telefono` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `access_code` VARCHAR(50) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scm_launches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(50) NOT NULL,
    `laboratory_id` INTEGER NOT NULL,
    `data_lancio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_consegna` DATETIME(3) NULL,
    `stato` VARCHAR(30) NOT NULL DEFAULT 'in_corso',
    `blocked_reason` TEXT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scm_launch_articles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `launch_id` INTEGER NOT NULL,
    `commessa` VARCHAR(100) NULL,
    `modello` VARCHAR(100) NULL,
    `colore` VARCHAR(100) NULL,
    `quantita` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scm_launch_phases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `launch_id` INTEGER NOT NULL,
    `phase_id` INTEGER NULL,
    `nome` VARCHAR(100) NOT NULL,
    `stato` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `data_inizio` DATETIME(3) NULL,
    `data_fine` DATETIME(3) NULL,
    `percentuale` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scm_standard_phases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `descrizione` TEXT NULL,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scm_progress_tracking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phase_id` INTEGER NOT NULL,
    `quantita` INTEGER NOT NULL DEFAULT 0,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scm_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `scm_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trk_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parent_id` INTEGER NULL,
    `parent_type` VARCHAR(50) NULL,
    `child_id` INTEGER NULL,
    `child_type` VARCHAR(50) NULL,
    `relation` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trk_lot_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lotto` VARCHAR(100) NOT NULL,
    `commessa` VARCHAR(100) NULL,
    `modello` VARCHAR(100) NULL,
    `colore` VARCHAR(100) NULL,
    `quantita` INTEGER NULL,
    `fornitore` VARCHAR(200) NULL,
    `data_arrivo` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trk_order_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ordine` VARCHAR(100) NOT NULL,
    `cliente` VARCHAR(200) NULL,
    `data_ordine` DATETIME(3) NULL,
    `data_consegna` DATETIME(3) NULL,
    `stato` VARCHAR(50) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trk_skus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sku` VARCHAR(100) NOT NULL,
    `modello` VARCHAR(100) NULL,
    `colore` VARCHAR(100) NULL,
    `taglia` VARCHAR(20) NULL,
    `descrizione` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trk_skus_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trk_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_date` DATE NOT NULL,
    `manovia1` INTEGER NOT NULL DEFAULT 0,
    `manovia1_notes` TEXT NULL,
    `manovia2` INTEGER NOT NULL DEFAULT 0,
    `manovia2_notes` TEXT NULL,
    `orlatura1` INTEGER NOT NULL DEFAULT 0,
    `orlatura1_notes` TEXT NULL,
    `orlatura2` INTEGER NOT NULL DEFAULT 0,
    `orlatura2_notes` TEXT NULL,
    `orlatura3` INTEGER NOT NULL DEFAULT 0,
    `orlatura3_notes` TEXT NULL,
    `orlatura4` INTEGER NOT NULL DEFAULT 0,
    `orlatura4_notes` TEXT NULL,
    `orlatura5` INTEGER NOT NULL DEFAULT 0,
    `orlatura5_notes` TEXT NULL,
    `taglio1` INTEGER NOT NULL DEFAULT 0,
    `taglio1_notes` TEXT NULL,
    `taglio2` INTEGER NOT NULL DEFAULT 0,
    `taglio2_notes` TEXT NULL,
    `total_montaggio` INTEGER NULL,
    `total_orlatura` INTEGER NULL,
    `total_taglio` INTEGER NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `production_records_production_date_key`(`production_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mrp_materials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codice` VARCHAR(100) NOT NULL,
    `nome` VARCHAR(200) NOT NULL,
    `category_id` INTEGER NULL,
    `unita` VARCHAR(20) NOT NULL DEFAULT 'PZ',
    `scorta` INTEGER NOT NULL DEFAULT 0,
    `giacenza` INTEGER NOT NULL DEFAULT 0,
    `lead_time` INTEGER NOT NULL DEFAULT 0,
    `fornitore` VARCHAR(200) NULL,
    `prezzo` DECIMAL(10, 2) NULL,
    `note` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mrp_materials_codice_key`(`codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mrp_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mrp_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NOT NULL,
    `quantita` INTEGER NOT NULL,
    `data_ordine` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_consegna` DATETIME(3) NULL,
    `stato` VARCHAR(30) NOT NULL DEFAULT 'ordinato',
    `fornitore` VARCHAR(200) NULL,
    `riferimento` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mrp_arrivals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NOT NULL,
    `quantita` INTEGER NOT NULL,
    `data_arrivo` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `riferimento` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mrp_requirements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NOT NULL,
    `commessa` VARCHAR(100) NULL,
    `quantita` INTEGER NOT NULL,
    `data_fabbisogno` DATETIME(3) NOT NULL,
    `stato` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `widg_available` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(50) NULL,
    `category` VARCHAR(50) NULL,
    `min_width` INTEGER NOT NULL DEFAULT 1,
    `min_height` INTEGER NOT NULL DEFAULT 1,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `widg_available_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `widg_usermap` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `widget_id` INTEGER NOT NULL,
    `x` INTEGER NOT NULL DEFAULT 0,
    `y` INTEGER NOT NULL DEFAULT 0,
    `width` INTEGER NOT NULL DEFAULT 1,
    `height` INTEGER NOT NULL DEFAULT 1,
    `config` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NULL,
    `link` VARCHAR(255) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cron_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_class` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `duration_ms` INTEGER NULL,
    `error_message` TEXT NULL,
    `output` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inwork_operators` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `cognome` VARCHAR(100) NULL,
    `matricola` VARCHAR(50) NULL,
    `pin` VARCHAR(10) NULL,
    `password` VARCHAR(255) NULL,
    `email` VARCHAR(100) NULL,
    `reparto` VARCHAR(100) NULL,
    `ruolo` VARCHAR(50) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inwork_operators_matricola_key`(`matricola`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inwork_module_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operator_id` INTEGER NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inwork_module_permissions_operator_id_module_key`(`operator_id`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_permissions` ADD CONSTRAINT `auth_permissions_id_utente_fkey` FOREIGN KEY (`id_utente`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `core_log` ADD CONSTRAINT `core_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rip_riparazioni` ADD CONSTRAINT `rip_riparazioni_laboratorio_id_fkey` FOREIGN KEY (`laboratorio_id`) REFERENCES `rip_laboratori`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rip_riparazioni` ADD CONSTRAINT `rip_riparazioni_reparto_id_fkey` FOREIGN KEY (`reparto_id`) REFERENCES `rip_reparti`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rip_riparazioni` ADD CONSTRAINT `rip_riparazioni_linea_id_fkey` FOREIGN KEY (`linea_id`) REFERENCES `rip_linee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cq_records` ADD CONSTRAINT `cq_records_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `cq_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cq_records` ADD CONSTRAINT `cq_records_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `cq_operators`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cq_records` ADD CONSTRAINT `cq_records_defect_type_id_fkey` FOREIGN KEY (`defect_type_id`) REFERENCES `cq_deftypes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exp_documents` ADD CONSTRAINT `exp_documents_terzista_id_fkey` FOREIGN KEY (`terzista_id`) REFERENCES `exp_terzisti`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exp_dati_articoli` ADD CONSTRAINT `exp_dati_articoli_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `exp_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exp_document_footers` ADD CONSTRAINT `exp_document_footers_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `exp_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scm_launches` ADD CONSTRAINT `scm_launches_laboratory_id_fkey` FOREIGN KEY (`laboratory_id`) REFERENCES `scm_laboratories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scm_launch_articles` ADD CONSTRAINT `scm_launch_articles_launch_id_fkey` FOREIGN KEY (`launch_id`) REFERENCES `scm_launches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scm_launch_phases` ADD CONSTRAINT `scm_launch_phases_launch_id_fkey` FOREIGN KEY (`launch_id`) REFERENCES `scm_launches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scm_launch_phases` ADD CONSTRAINT `scm_launch_phases_phase_id_fkey` FOREIGN KEY (`phase_id`) REFERENCES `scm_standard_phases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scm_progress_tracking` ADD CONSTRAINT `scm_progress_tracking_phase_id_fkey` FOREIGN KEY (`phase_id`) REFERENCES `scm_launch_phases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_records` ADD CONSTRAINT `production_records_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_records` ADD CONSTRAINT `production_records_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mrp_materials` ADD CONSTRAINT `mrp_materials_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `mrp_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mrp_orders` ADD CONSTRAINT `mrp_orders_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `mrp_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mrp_arrivals` ADD CONSTRAINT `mrp_arrivals_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `mrp_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mrp_requirements` ADD CONSTRAINT `mrp_requirements_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `mrp_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `widg_usermap` ADD CONSTRAINT `widg_usermap_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `widg_usermap` ADD CONSTRAINT `widg_usermap_widget_id_fkey` FOREIGN KEY (`widget_id`) REFERENCES `widg_available`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_notifications` ADD CONSTRAINT `auth_notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inwork_module_permissions` ADD CONSTRAINT `inwork_module_permissions_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `inwork_operators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
