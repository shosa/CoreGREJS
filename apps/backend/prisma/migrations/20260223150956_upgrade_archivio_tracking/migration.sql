/*
  Warnings:

  - You are about to drop the column `archivedAt` on the `track_links_archive` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `track_links_archive` DROP COLUMN `archivedAt`,
    ADD COLUMN `archived_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `articolo` VARCHAR(255) NULL,
    ADD COLUMN `commessa` VARCHAR(20) NULL,
    ADD COLUMN `descrizione` VARCHAR(255) NULL,
    ADD COLUMN `lot_date` DATE NULL,
    ADD COLUMN `lot_doc` VARCHAR(255) NULL,
    ADD COLUMN `lot_note` VARCHAR(255) NULL,
    ADD COLUMN `order_date` DATE NULL,
    ADD COLUMN `ordine` INTEGER NULL,
    ADD COLUMN `ragione_soc` VARCHAR(35) NULL,
    ADD COLUMN `sku` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `track_links_archive_commessa_idx` ON `track_links_archive`(`commessa`);
