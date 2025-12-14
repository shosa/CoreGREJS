/*
  Warnings:

  - You are about to drop the `mrp_arrivals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mrp_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mrp_materials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mrp_orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mrp_requirements` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `mrp_arrivals` DROP FOREIGN KEY `mrp_arrivals_material_id_fkey`;

-- DropForeignKey
ALTER TABLE `mrp_materials` DROP FOREIGN KEY `mrp_materials_category_id_fkey`;

-- DropForeignKey
ALTER TABLE `mrp_orders` DROP FOREIGN KEY `mrp_orders_material_id_fkey`;

-- DropForeignKey
ALTER TABLE `mrp_requirements` DROP FOREIGN KEY `mrp_requirements_material_id_fkey`;

-- DropTable
DROP TABLE `mrp_arrivals`;

-- DropTable
DROP TABLE `mrp_categories`;

-- DropTable
DROP TABLE `mrp_materials`;

-- DropTable
DROP TABLE `mrp_orders`;

-- DropTable
DROP TABLE `mrp_requirements`;
