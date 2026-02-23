-- CreateTable
CREATE TABLE `track_links_archive` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cartel` INTEGER NOT NULL,
    `type_id` INTEGER NOT NULL,
    `typeName` VARCHAR(255) NOT NULL,
    `lot` VARCHAR(255) NOT NULL,
    `note` VARCHAR(255) NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `track_links_archive_cartel_idx`(`cartel`),
    INDEX `track_links_archive_lot_idx`(`lot`),
    INDEX `track_links_archive_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
