-- CreateTable
CREATE TABLE `ana_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo_documento` VARCHAR(50) NULL,
    `data_documento` DATE NULL,
    `linea` VARCHAR(100) NULL,
    `articolo` VARCHAR(255) NULL,
    `descrizione_art` VARCHAR(255) NULL,
    `tipologia_ordine` VARCHAR(100) NULL,
    `quantita` DECIMAL(10, 2) NULL,
    `prezzo_unitario` DECIMAL(10, 3) NULL,
    `prodotto_estero` BOOLEAN NOT NULL DEFAULT false,
    `reparto_id` INTEGER NULL,
    `reparto_finale_id` INTEGER NULL,
    `costo_taglio` DECIMAL(10, 3) NULL,
    `costo_orlatura` DECIMAL(10, 3) NULL,
    `costo_strobel` DECIMAL(10, 3) NULL,
    `altri_costi` DECIMAL(10, 3) NULL,
    `costo_montaggio` DECIMAL(10, 3) NULL,
    `import_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ana_records_data_documento_idx`(`data_documento`),
    INDEX `ana_records_articolo_idx`(`articolo`),
    INDEX `ana_records_tipo_documento_idx`(`tipo_documento`),
    INDEX `ana_records_import_id_idx`(`import_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ana_reparti` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ana_reparti_codice_key`(`codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ana_imports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NULL,
    `records_count` INTEGER NOT NULL DEFAULT 0,
    `stato` VARCHAR(20) NOT NULL DEFAULT 'completato',
    `error_message` TEXT NULL,
    `user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ana_imports_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ana_records` ADD CONSTRAINT `ana_records_reparto_id_fkey` FOREIGN KEY (`reparto_id`) REFERENCES `ana_reparti`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ana_records` ADD CONSTRAINT `ana_records_reparto_finale_id_fkey` FOREIGN KEY (`reparto_finale_id`) REFERENCES `ana_reparti`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ana_records` ADD CONSTRAINT `ana_records_import_id_fkey` FOREIGN KEY (`import_id`) REFERENCES `ana_imports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
