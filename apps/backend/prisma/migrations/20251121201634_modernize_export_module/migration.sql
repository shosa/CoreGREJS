/*
  Warnings:

  - You are about to drop the column `cap` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `cf` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `citta` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `codice` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `indirizzo` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `piva` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `provincia` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `exp_terzisti` table. All the data in the column will be lost.
  - You are about to drop the `exp_dati_articoli` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exp_document_footers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exp_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exp_missing_data` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ragione_sociale` to the `exp_terzisti` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `exp_dati_articoli` DROP FOREIGN KEY `exp_dati_articoli_document_id_fkey`;

-- DropForeignKey
ALTER TABLE `exp_document_footers` DROP FOREIGN KEY `exp_document_footers_document_id_fkey`;

-- DropForeignKey
ALTER TABLE `exp_documents` DROP FOREIGN KEY `exp_documents_terzista_id_fkey`;

-- AlterTable
ALTER TABLE `exp_terzisti` DROP COLUMN `cap`,
    DROP COLUMN `cf`,
    DROP COLUMN `citta`,
    DROP COLUMN `codice`,
    DROP COLUMN `email`,
    DROP COLUMN `indirizzo`,
    DROP COLUMN `nome`,
    DROP COLUMN `piva`,
    DROP COLUMN `provincia`,
    DROP COLUMN `telefono`,
    ADD COLUMN `autorizzazione` VARCHAR(255) NULL,
    ADD COLUMN `consegna` TEXT NULL,
    ADD COLUMN `indirizzo_1` VARCHAR(255) NULL,
    ADD COLUMN `indirizzo_2` VARCHAR(255) NULL,
    ADD COLUMN `indirizzo_3` VARCHAR(255) NULL,
    ADD COLUMN `nazione` VARCHAR(100) NULL,
    ADD COLUMN `ragione_sociale` VARCHAR(255) NOT NULL;

-- DropTable
DROP TABLE `exp_dati_articoli`;

-- DropTable
DROP TABLE `exp_document_footers`;

-- DropTable
DROP TABLE `exp_documents`;

-- DropTable
DROP TABLE `exp_missing_data`;

-- CreateTable
CREATE TABLE `exp_articoli_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codice_articolo` VARCHAR(255) NOT NULL,
    `descrizione` VARCHAR(255) NULL,
    `voce_doganale` VARCHAR(50) NULL,
    `um` VARCHAR(10) NULL,
    `prezzo_unitario` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exp_articoli_master_codice_articolo_key`(`codice_articolo`),
    INDEX `exp_articoli_master_codice_articolo_idx`(`codice_articolo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_documenti` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `progressivo` VARCHAR(50) NOT NULL,
    `terzista_id` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `stato` VARCHAR(20) NOT NULL DEFAULT 'Aperto',
    `first_boot` BOOLEAN NOT NULL DEFAULT true,
    `autorizzazione` VARCHAR(255) NULL,
    `commento` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exp_documenti_progressivo_key`(`progressivo`),
    INDEX `exp_documenti_terzista_id_idx`(`terzista_id`),
    INDEX `exp_documenti_stato_idx`(`stato`),
    INDEX `exp_documenti_created_at_idx`(`created_at`),
    INDEX `exp_documenti_stato_created_at_idx`(`stato`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_righe_documento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documento_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `qta_originale` INTEGER NOT NULL DEFAULT 0,
    `qta_reale` INTEGER NOT NULL DEFAULT 0,
    `is_mancante` BOOLEAN NOT NULL DEFAULT false,
    `rif_mancante` VARCHAR(50) NULL,
    `tipo_riga` VARCHAR(20) NOT NULL DEFAULT 'articolo',
    `codice_libero` VARCHAR(255) NULL,
    `descrizione_libera` VARCHAR(255) NULL,
    `voce_libera` VARCHAR(50) NULL,
    `um_libera` VARCHAR(10) NULL,
    `prezzo_libero` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `exp_righe_documento_documento_id_idx`(`documento_id`),
    INDEX `exp_righe_documento_article_id_idx`(`article_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_piede_documenti` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documento_id` INTEGER NOT NULL,
    `aspetto_colli` VARCHAR(255) NULL,
    `n_colli` INTEGER NULL,
    `tot_peso_lordo` DECIMAL(10, 2) NULL,
    `tot_peso_netto` DECIMAL(10, 2) NULL,
    `trasportatore` VARCHAR(255) NULL,
    `consegnato_per` TEXT NULL,
    `voci_doganali` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exp_piede_documenti_documento_id_key`(`documento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_dati_mancanti` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documento_id` INTEGER NOT NULL,
    `codice_articolo` VARCHAR(255) NOT NULL,
    `qta_mancante` INTEGER NOT NULL,
    `descrizione` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exp_dati_mancanti_documento_id_idx`(`documento_id`),
    INDEX `exp_dati_mancanti_codice_articolo_idx`(`codice_articolo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_dati_lanci_ddt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documento_id` INTEGER NOT NULL,
    `lancio` VARCHAR(50) NOT NULL,
    `articolo` VARCHAR(255) NOT NULL,
    `paia` INTEGER NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exp_dati_lanci_ddt_documento_id_idx`(`documento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `exp_terzisti_ragione_sociale_idx` ON `exp_terzisti`(`ragione_sociale`);

-- AddForeignKey
ALTER TABLE `exp_documenti` ADD CONSTRAINT `exp_documenti_terzista_id_fkey` FOREIGN KEY (`terzista_id`) REFERENCES `exp_terzisti`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exp_righe_documento` ADD CONSTRAINT `exp_righe_documento_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `exp_documenti`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exp_righe_documento` ADD CONSTRAINT `exp_righe_documento_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `exp_articoli_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exp_piede_documenti` ADD CONSTRAINT `exp_piede_documenti_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `exp_documenti`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exp_dati_mancanti` ADD CONSTRAINT `exp_dati_mancanti_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `exp_documenti`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exp_dati_lanci_ddt` ADD CONSTRAINT `exp_dati_lanci_ddt_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `exp_documenti`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
