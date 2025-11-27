/*
  Warnings:

  - You are about to drop the column `codice_articolo` on the `exp_dati_mancanti` table. All the data in the column will be lost.
  - You are about to drop the column `descrizione` on the `exp_dati_mancanti` table. All the data in the column will be lost.
  - Added the required column `article_id` to the `exp_dati_mancanti` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add article_id as nullable
ALTER TABLE `exp_dati_mancanti` ADD COLUMN `article_id` INTEGER NULL;

-- Step 2: Populate article_id by matching codice_articolo with exp_articoli_master
UPDATE `exp_dati_mancanti` m
INNER JOIN `exp_articoli_master` a ON m.`codice_articolo` = a.`codice_articolo`
SET m.`article_id` = a.`id`;

-- Step 3: Delete rows that don't have a matching article (orphaned data)
DELETE FROM `exp_dati_mancanti` WHERE `article_id` IS NULL;

-- Step 4: Make article_id NOT NULL
ALTER TABLE `exp_dati_mancanti` MODIFY COLUMN `article_id` INTEGER NOT NULL;

-- Step 5: Drop old columns and index
DROP INDEX `exp_dati_mancanti_codice_articolo_idx` ON `exp_dati_mancanti`;
ALTER TABLE `exp_dati_mancanti` DROP COLUMN `codice_articolo`;
ALTER TABLE `exp_dati_mancanti` DROP COLUMN `descrizione`;

-- Step 6: Create new index
CREATE INDEX `exp_dati_mancanti_article_id_idx` ON `exp_dati_mancanti`(`article_id`);

-- Step 7: Add foreign key constraint
ALTER TABLE `exp_dati_mancanti` ADD CONSTRAINT `exp_dati_mancanti_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `exp_articoli_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
