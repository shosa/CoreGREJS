/*
  Warnings:

  - You are about to drop the column `admin_type` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `expires` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `remember_token` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `series_id` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `theme_color` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `linea_id` on the `rip_riparazioni` table. All the data in the column will be lost.
  - You are about to drop the `auth_notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rip_interne` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rip_linee` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `auth_notifications` DROP FOREIGN KEY `auth_notifications_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `rip_interne` DROP FOREIGN KEY `rip_interne_numerata_id_fkey`;

-- DropForeignKey
ALTER TABLE `rip_interne` DROP FOREIGN KEY `rip_interne_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `rip_riparazioni` DROP FOREIGN KEY `rip_riparazioni_linea_id_fkey`;

-- AlterTable
ALTER TABLE `auth_users` DROP COLUMN `admin_type`,
    DROP COLUMN `expires`,
    DROP COLUMN `remember_token`,
    DROP COLUMN `series_id`,
    DROP COLUMN `theme_color`,
    ADD COLUMN `mail_password` VARCHAR(255) NULL,
    ADD COLUMN `user_type` VARCHAR(20) NOT NULL DEFAULT 'operator';

-- AlterTable
ALTER TABLE `core_log` ADD COLUMN `entity` VARCHAR(100) NULL,
    ADD COLUMN `entity_id` VARCHAR(100) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `module` VARCHAR(50) NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE `rip_riparazioni` DROP COLUMN `linea_id`;

-- DropTable
DROP TABLE `auth_notifications`;

-- DropTable
DROP TABLE `rip_interne`;

-- DropTable
DROP TABLE `rip_linee`;

-- CreateIndex
CREATE INDEX `core_log_module_idx` ON `core_log`(`module`);

-- CreateIndex
CREATE INDEX `core_log_action_idx` ON `core_log`(`action`);

-- CreateIndex
CREATE INDEX `core_log_created_at_idx` ON `core_log`(`created_at`);

-- RenameIndex
ALTER TABLE `core_log` RENAME INDEX `core_log_user_id_fkey` TO `core_log_user_id_idx`;
