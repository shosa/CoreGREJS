/*
  Warnings:

  - You are about to alter the column `qta_originale` on the `exp_righe_documento` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `qta_reale` on the `exp_righe_documento` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to alter the column `prezzo_libero` on the `exp_righe_documento` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.

*/
-- AlterTable
ALTER TABLE `exp_righe_documento` MODIFY `qta_originale` DECIMAL(10, 2) NULL DEFAULT 0,
    MODIFY `qta_reale` DECIMAL(10, 2) NULL DEFAULT 0,
    MODIFY `prezzo_libero` DECIMAL(10, 3) NULL;
