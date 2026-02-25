-- CreateTable
CREATE TABLE `ana_reparto_mappings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `analitica_reparto_id` INTEGER NOT NULL,
    `prod_department_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ana_reparto_mappings_analitica_reparto_id_idx`(`analitica_reparto_id`),
    UNIQUE INDEX `ana_reparto_mappings_prod_department_id_key`(`prod_department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ana_reparto_mappings` ADD CONSTRAINT `ana_reparto_mappings_analitica_reparto_id_fkey` FOREIGN KEY (`analitica_reparto_id`) REFERENCES `ana_reparti`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ana_reparto_mappings` ADD CONSTRAINT `ana_reparto_mappings_prod_department_id_fkey` FOREIGN KEY (`prod_department_id`) REFERENCES `prod_departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
