/*
  Warnings:

  - A unique constraint covering the columns `[id_numerata]` on the table `rip_idnumerate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_numerata` to the `rip_idnumerate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `rip_idnumerate` ADD COLUMN `id_numerata` VARCHAR(2) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `rip_idnumerate_id_numerata_key` ON `rip_idnumerate`(`id_numerata`);
