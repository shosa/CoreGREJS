/*
  Warnings:

  - You are about to alter the column `qta_mancante` on the `exp_dati_mancanti` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE `exp_dati_mancanti` MODIFY `qta_mancante` DECIMAL(10, 2) NULL;
