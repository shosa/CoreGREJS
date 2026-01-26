/*
  Warnings:

  - You are about to drop the column `codice` on the `cq_deftypes` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `cq_deftypes` table. All the data in the column will be lost.
  - You are about to drop the column `gravita` on the `cq_deftypes` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `cq_deftypes` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `cq_deftypes` table. All the data in the column will be lost.
  - You are about to drop the column `codice` on the `cq_departments` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `cq_departments` table. All the data in the column will be lost.
  - You are about to drop the column `descrizione` on the `cq_departments` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `cq_departments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `cq_departments` table. All the data in the column will be lost.
  - You are about to drop the column `attivo` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `commessa` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `data_fine` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `data_inizio` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `descrizione` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `modello` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `cq_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `cartellino` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `colore` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `commessa` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `defect_type_id` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `department_id` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `esito` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `foto` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `modello` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `operator_id` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `quantita` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `taglia` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `cq_records` table. All the data in the column will be lost.
  - You are about to drop the column `linea_id` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the `auth_notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cq_operators` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rip_interne` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rip_linee` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[descrizione]` on the table `cq_deftypes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nome_reparto]` on the table `cq_departments` will be added. If there are existing duplicate values, this will fail.
  - Made the column `descrizione` on table `cq_deftypes` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `nome_reparto` to the `cq_departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cartellino_id` to the `cq_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taglia` to the `cq_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo_difetto` to the `cq_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `articolo` to the `cq_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cod_articolo` to the `cq_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `linea` to the `cq_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numero_cartellino` to the `cq_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operatore` to the `cq_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paia_totali` to the `cq_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `auth_notifications` DROP FOREIGN KEY `auth_notifications_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `cq_records` DROP FOREIGN KEY `cq_records_defect_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `cq_records` DROP FOREIGN KEY `cq_records_department_id_fkey`;

-- DropForeignKey
ALTER TABLE `cq_records` DROP FOREIGN KEY `cq_records_operator_id_fkey`;

-- DropForeignKey
ALTER TABLE `rip_interne` DROP FOREIGN KEY `rip_interne_numerata_id_fkey`;

-- DropForeignKey
ALTER TABLE `rip_interne` DROP FOREIGN KEY `rip_interne_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `rip_riparazioni` DROP FOREIGN KEY `rip_riparazioni_linea_id_fkey`;

-- AlterTable
ALTER TABLE `core_log` ADD COLUMN `entity` VARCHAR(100) NULL,
    ADD COLUMN `entity_id` VARCHAR(100) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `module` VARCHAR(50) NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE `cq_deftypes` DROP COLUMN `codice`,
    DROP COLUMN `created_at`,
    DROP COLUMN `gravita`,
    DROP COLUMN `nome`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `data_creazione` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `ordine` INTEGER NOT NULL DEFAULT 0,
    MODIFY `categoria` VARCHAR(100) NULL,
    MODIFY `descrizione` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `cq_departments` DROP COLUMN `codice`,
    DROP COLUMN `created_at`,
    DROP COLUMN `descrizione`,
    DROP COLUMN `nome`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `data_creazione` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `nome_reparto` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `cq_exceptions` DROP COLUMN `attivo`,
    DROP COLUMN `commessa`,
    DROP COLUMN `created_at`,
    DROP COLUMN `data_fine`,
    DROP COLUMN `data_inizio`,
    DROP COLUMN `descrizione`,
    DROP COLUMN `modello`,
    DROP COLUMN `tipo`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `cartellino_id` INTEGER NOT NULL,
    ADD COLUMN `data_creazione` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `fotoPath` VARCHAR(500) NULL,
    ADD COLUMN `note_operatore` VARCHAR(1000) NULL,
    ADD COLUMN `taglia` VARCHAR(10) NOT NULL,
    ADD COLUMN `tipo_difetto` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `cq_records` DROP COLUMN `cartellino`,
    DROP COLUMN `colore`,
    DROP COLUMN `commessa`,
    DROP COLUMN `created_at`,
    DROP COLUMN `defect_type_id`,
    DROP COLUMN `department_id`,
    DROP COLUMN `esito`,
    DROP COLUMN `foto`,
    DROP COLUMN `modello`,
    DROP COLUMN `operator_id`,
    DROP COLUMN `quantita`,
    DROP COLUMN `taglia`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `articolo` VARCHAR(255) NOT NULL,
    ADD COLUMN `cod_articolo` VARCHAR(50) NOT NULL,
    ADD COLUMN `ha_eccezioni` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `linea` VARCHAR(2) NOT NULL,
    ADD COLUMN `numero_cartellino` VARCHAR(50) NOT NULL,
    ADD COLUMN `operatore` VARCHAR(255) NOT NULL,
    ADD COLUMN `paia_totali` INTEGER NOT NULL,
    ADD COLUMN `reparto` VARCHAR(255) NULL,
    ADD COLUMN `tipo_cq` VARCHAR(20) NOT NULL DEFAULT 'INTERNO',
    MODIFY `note` VARCHAR(10000) NULL;

-- AlterTable
ALTER TABLE `rip_riparazioni` DROP COLUMN `linea_id`;

-- DropTable
DROP TABLE `auth_notifications`;

-- DropTable
DROP TABLE `cq_operators`;

-- DropTable
DROP TABLE `rip_interne`;

-- DropTable
DROP TABLE `rip_linee`;

-- CreateTable
CREATE TABLE `exp_aspetto_merce` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descrizione` VARCHAR(255) NOT NULL,
    `codice` VARCHAR(50) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exp_aspetto_merce_codice_key`(`codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exp_vettori` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ragione_sociale` VARCHAR(255) NOT NULL,
    `codice` VARCHAR(50) NULL,
    `indirizzo` VARCHAR(255) NULL,
    `telefono` VARCHAR(50) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `exp_vettori_codice_key`(`codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inwork_available_modules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module_id` VARCHAR(50) NOT NULL,
    `module_name` VARCHAR(100) NOT NULL,
    `descrizione` VARCHAR(255) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inwork_available_modules_module_id_key`(`module_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `minio_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bucket` VARCHAR(100) NOT NULL,
    `object_key` VARCHAR(500) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `mime_type` VARCHAR(100) NULL,
    `user_id` INTEGER NULL,
    `job_id` CHAR(36) NULL,
    `tags` JSON NULL,
    `metadata` JSON NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_access` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `minio_files_bucket_user_id_idx`(`bucket`, `user_id`),
    INDEX `minio_files_uploaded_at_idx`(`uploaded_at`),
    INDEX `minio_files_job_id_idx`(`job_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `core_log_module_idx` ON `core_log`(`module`);

-- CreateIndex
CREATE INDEX `core_log_action_idx` ON `core_log`(`action`);

-- CreateIndex
CREATE INDEX `core_log_created_at_idx` ON `core_log`(`created_at`);

-- CreateIndex
CREATE UNIQUE INDEX `cq_deftypes_descrizione_key` ON `cq_deftypes`(`descrizione`);

-- CreateIndex
CREATE UNIQUE INDEX `cq_departments_nome_reparto_key` ON `cq_departments`(`nome_reparto`);

-- CreateIndex
CREATE INDEX `cq_exceptions_cartellino_id_idx` ON `cq_exceptions`(`cartellino_id`);

-- CreateIndex
CREATE INDEX `cq_records_data_controllo_idx` ON `cq_records`(`data_controllo`);

-- CreateIndex
CREATE INDEX `cq_records_reparto_idx` ON `cq_records`(`reparto`);

-- CreateIndex
CREATE INDEX `cq_records_operatore_idx` ON `cq_records`(`operatore`);

-- AddForeignKey
ALTER TABLE `cq_exceptions` ADD CONSTRAINT `cq_exceptions_cartellino_id_fkey` FOREIGN KEY (`cartellino_id`) REFERENCES `cq_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `minio_files` ADD CONSTRAINT `minio_files_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `minio_files` ADD CONSTRAINT `minio_files_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `core_jobs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `core_log` RENAME INDEX `core_log_user_id_fkey` TO `core_log_user_id_idx`;
