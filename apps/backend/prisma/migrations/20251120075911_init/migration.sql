/*
  Warnings:

  - You are about to drop the `production_records` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `production_records` DROP FOREIGN KEY `production_records_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `production_records` DROP FOREIGN KEY `production_records_updated_by_fkey`;

-- DropTable
DROP TABLE `production_records`;

-- CreateTable
CREATE TABLE `prod_phases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `codice` VARCHAR(20) NULL,
    `colore` VARCHAR(20) NULL,
    `icona` VARCHAR(50) NULL,
    `descrizione` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `prod_phases_codice_key`(`codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prod_departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phase_id` INTEGER NOT NULL,
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
CREATE TABLE `prod_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_date` DATE NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `prod_records_production_date_key`(`production_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prod_values` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `record_id` INTEGER NOT NULL,
    `department_id` INTEGER NOT NULL,
    `valore` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `prod_values_record_id_department_id_key`(`record_id`, `department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `prod_departments` ADD CONSTRAINT `prod_departments_phase_id_fkey` FOREIGN KEY (`phase_id`) REFERENCES `prod_phases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prod_records` ADD CONSTRAINT `prod_records_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prod_records` ADD CONSTRAINT `prod_records_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prod_values` ADD CONSTRAINT `prod_values_record_id_fkey` FOREIGN KEY (`record_id`) REFERENCES `prod_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prod_values` ADD CONSTRAINT `prod_values_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `prod_departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
