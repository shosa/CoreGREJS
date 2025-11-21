/*
  Warnings:

  - You are about to drop the column `brand` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `cliente` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `colore` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `commessa` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `data_consegna` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `forma` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `modello` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `quantita` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `stagione` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `core_dati` table. All the data in the column will be lost.
  - You are about to drop the `trk_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trk_lot_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trk_order_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trk_skus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trk_types` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[Cartel]` on the table `core_dati` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Articolo` to the `core_dati` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Descrizione Articolo` to the `core_dati` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `core_dati` DROP COLUMN `brand`,
    DROP COLUMN `cliente`,
    DROP COLUMN `colore`,
    DROP COLUMN `commessa`,
    DROP COLUMN `created_at`,
    DROP COLUMN `data_consegna`,
    DROP COLUMN `forma`,
    DROP COLUMN `modello`,
    DROP COLUMN `note`,
    DROP COLUMN `quantita`,
    DROP COLUMN `stagione`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `Articolo` VARCHAR(255) NOT NULL,
    ADD COLUMN `CCli` INTEGER NULL,
    ADD COLUMN `Cartel` INTEGER NULL,
    ADD COLUMN `Commessa Cli` VARCHAR(20) NULL,
    ADD COLUMN `Descrizione Articolo` VARCHAR(255) NOT NULL,
    ADD COLUMN `Ln` VARCHAR(2) NULL,
    ADD COLUMN `Marca Etich` VARCHAR(13) NULL,
    ADD COLUMN `Nu` VARCHAR(2) NULL,
    ADD COLUMN `Ordine` INTEGER NULL,
    ADD COLUMN `P01` INTEGER NULL,
    ADD COLUMN `P02` INTEGER NULL,
    ADD COLUMN `P03` INTEGER NULL,
    ADD COLUMN `P04` INTEGER NULL,
    ADD COLUMN `P05` INTEGER NULL,
    ADD COLUMN `P06` INTEGER NULL,
    ADD COLUMN `P07` INTEGER NULL,
    ADD COLUMN `P08` INTEGER NULL,
    ADD COLUMN `P09` INTEGER NULL,
    ADD COLUMN `P10` INTEGER NULL,
    ADD COLUMN `P11` INTEGER NULL,
    ADD COLUMN `P12` INTEGER NULL,
    ADD COLUMN `P13` INTEGER NULL,
    ADD COLUMN `P14` INTEGER NULL,
    ADD COLUMN `P15` INTEGER NULL,
    ADD COLUMN `P16` INTEGER NULL,
    ADD COLUMN `P17` INTEGER NULL,
    ADD COLUMN `P18` INTEGER NULL,
    ADD COLUMN `P19` INTEGER NULL,
    ADD COLUMN `P20` INTEGER NULL,
    ADD COLUMN `PO` VARCHAR(255) NULL,
    ADD COLUMN `Ragione Sociale` VARCHAR(35) NULL,
    ADD COLUMN `Rg` INTEGER NULL,
    ADD COLUMN `St` VARCHAR(3) NULL,
    ADD COLUMN `Tot` INTEGER NULL;

-- DropTable
DROP TABLE `trk_links`;

-- DropTable
DROP TABLE `trk_lot_info`;

-- DropTable
DROP TABLE `trk_order_info`;

-- DropTable
DROP TABLE `trk_skus`;

-- DropTable
DROP TABLE `trk_types`;

-- CreateTable
CREATE TABLE `track_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cartel` INTEGER NOT NULL,
    `type_id` INTEGER NOT NULL,
    `lot` VARCHAR(255) NOT NULL,
    `note` VARCHAR(255) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `track_links_cartel_idx`(`cartel`),
    INDEX `track_links_lot_idx`(`lot`),
    INDEX `track_links_type_id_idx`(`type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `track_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `note` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `track_lots_info` (
    `lot` VARCHAR(255) NOT NULL,
    `doc` VARCHAR(255) NULL,
    `date` DATE NULL,
    `note` VARCHAR(255) NULL,

    PRIMARY KEY (`lot`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `track_order_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ordine` VARCHAR(255) NOT NULL,
    `date` DATE NULL,

    UNIQUE INDEX `track_order_info_ordine_key`(`ordine`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `track_sku` (
    `art` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(255) NULL,

    PRIMARY KEY (`art`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `core_jobs` (
    `id` CHAR(36) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `output_path` VARCHAR(255) NULL,
    `output_name` VARCHAR(255) NULL,
    `output_mime` VARCHAR(100) NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `core_jobs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `core_dati_Cartel_key` ON `core_dati`(`Cartel`);

-- CreateIndex
CREATE INDEX `core_dati_Ordine_idx` ON `core_dati`(`Ordine`);

-- CreateIndex
CREATE INDEX `core_dati_Commessa Cli_idx` ON `core_dati`(`Commessa Cli`);

-- CreateIndex
CREATE INDEX `core_dati_Articolo_idx` ON `core_dati`(`Articolo`);

-- AddForeignKey
ALTER TABLE `track_links` ADD CONSTRAINT `track_links_type_id_fkey` FOREIGN KEY (`type_id`) REFERENCES `track_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `core_jobs` ADD CONSTRAINT `core_jobs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
