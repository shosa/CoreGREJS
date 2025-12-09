/*
  Warnings:

  - You are about to drop the column `admin_type` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `expires` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `remember_token` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `series_id` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `theme_color` on the `auth_users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `auth_users` DROP COLUMN `admin_type`,
    DROP COLUMN `expires`,
    DROP COLUMN `remember_token`,
    DROP COLUMN `series_id`,
    DROP COLUMN `theme_color`,
    ADD COLUMN `mail_password` VARCHAR(255) NULL,
    ADD COLUMN `user_type` VARCHAR(20) NOT NULL DEFAULT 'operator';
