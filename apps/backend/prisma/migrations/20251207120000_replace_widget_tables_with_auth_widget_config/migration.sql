-- Drop old widget tables
DROP TABLE IF EXISTS `widg_usermap`;
DROP TABLE IF EXISTS `widg_available`;

-- Create new auth_widget_config table
CREATE TABLE `auth_widget_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `widget_id` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `x` INTEGER NOT NULL DEFAULT 0,
    `y` INTEGER NOT NULL DEFAULT 0,
    `w` INTEGER NOT NULL DEFAULT 1,
    `h` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_widget_config_user_id_widget_id_key`(`user_id`, `widget_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key
ALTER TABLE `auth_widget_config` ADD CONSTRAINT `auth_widget_config_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
