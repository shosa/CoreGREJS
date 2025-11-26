/*
  Warnings:

  - You are about to alter the column `prezzo_unitario` on the `exp_articoli_master` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.

*/
-- AlterTable
ALTER TABLE `exp_articoli_master` MODIFY `prezzo_unitario` DECIMAL(10, 3) NULL;
