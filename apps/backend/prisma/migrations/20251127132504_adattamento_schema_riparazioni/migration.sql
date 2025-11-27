/*
  Warnings:

  - You are about to drop the column `colore` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `commessa` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `data_apertura` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `difetto` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `modello` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `priorita` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `quantita` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `stato` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `taglia` on the `rip_interne` table. All the data in the column will be lost.
  - You are about to drop the column `colore` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the column `commessa` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the column `data_apertura` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the column `difetto` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the column `modello` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the column `operatore` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the column `priorita` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the column `stato` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the column `taglia` on the `rip_riparazioni` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_riparazione]` on the table `rip_interne` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_riparazione]` on the table `rip_riparazioni` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_riparazione` to the `rip_interne` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_riparazione` to the `rip_riparazioni` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `rip_interne` DROP COLUMN `colore`,
    DROP COLUMN `commessa`,
    DROP COLUMN `data_apertura`,
    DROP COLUMN `difetto`,
    DROP COLUMN `modello`,
    DROP COLUMN `priorita`,
    DROP COLUMN `quantita`,
    DROP COLUMN `stato`,
    DROP COLUMN `taglia`,
    ADD COLUMN `causale` TEXT NULL,
    ADD COLUMN `completa` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `id_riparazione` VARCHAR(10) NOT NULL,
    ADD COLUMN `numerata_id` INTEGER NULL,
    ADD COLUMN `p01` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p02` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p03` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p04` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p05` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p06` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p07` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p08` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p09` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p10` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p11` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p12` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p13` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p14` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p15` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p16` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p17` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p18` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p19` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p20` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `qta_totale` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `rip_riparazioni` DROP COLUMN `colore`,
    DROP COLUMN `commessa`,
    DROP COLUMN `data_apertura`,
    DROP COLUMN `difetto`,
    DROP COLUMN `modello`,
    DROP COLUMN `operatore`,
    DROP COLUMN `priorita`,
    DROP COLUMN `stato`,
    DROP COLUMN `taglia`,
    ADD COLUMN `causale` TEXT NULL,
    ADD COLUMN `completa` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `id_riparazione` VARCHAR(10) NOT NULL,
    ADD COLUMN `numerata_id` INTEGER NULL,
    ADD COLUMN `p01` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p02` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p03` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p04` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p05` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p06` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p07` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p08` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p09` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p10` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p11` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p12` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p13` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p14` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p15` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p16` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p17` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p18` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p19` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `p20` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `qta_totale` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `user_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `rip_idnumerate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `n01` VARCHAR(10) NULL,
    `n02` VARCHAR(10) NULL,
    `n03` VARCHAR(10) NULL,
    `n04` VARCHAR(10) NULL,
    `n05` VARCHAR(10) NULL,
    `n06` VARCHAR(10) NULL,
    `n07` VARCHAR(10) NULL,
    `n08` VARCHAR(10) NULL,
    `n09` VARCHAR(10) NULL,
    `n10` VARCHAR(10) NULL,
    `n11` VARCHAR(10) NULL,
    `n12` VARCHAR(10) NULL,
    `n13` VARCHAR(10) NULL,
    `n14` VARCHAR(10) NULL,
    `n15` VARCHAR(10) NULL,
    `n16` VARCHAR(10) NULL,
    `n17` VARCHAR(10) NULL,
    `n18` VARCHAR(10) NULL,
    `n19` VARCHAR(10) NULL,
    `n20` VARCHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `rip_interne_id_riparazione_key` ON `rip_interne`(`id_riparazione`);

-- CreateIndex
CREATE UNIQUE INDEX `rip_riparazioni_id_riparazione_key` ON `rip_riparazioni`(`id_riparazione`);

-- AddForeignKey
ALTER TABLE `rip_riparazioni` ADD CONSTRAINT `rip_riparazioni_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rip_riparazioni` ADD CONSTRAINT `rip_riparazioni_numerata_id_fkey` FOREIGN KEY (`numerata_id`) REFERENCES `rip_idnumerate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rip_interne` ADD CONSTRAINT `rip_interne_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rip_interne` ADD CONSTRAINT `rip_interne_numerata_id_fkey` FOREIGN KEY (`numerata_id`) REFERENCES `rip_idnumerate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
