-- CreateTable
CREATE TABLE `printer_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cups_name` VARCHAR(255) NOT NULL,
    `alias` VARCHAR(255) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `printer_configs_cups_name_key`(`cups_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
