-- CreateTable
CREATE TABLE `activity_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `user_tipo` VARCHAR(191) NULL,
    `user_nome` VARCHAR(191) NULL,
    `evento` VARCHAR(191) NOT NULL,
    `metodo` VARCHAR(191) NULL,
    `rota` TEXT NULL,
    `status_code` SMALLINT UNSIGNED NULL,
    `ip` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `payload` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_user_id_idx`(`user_id`),
    INDEX `activity_logs_evento_idx`(`evento`),
    INDEX `activity_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
