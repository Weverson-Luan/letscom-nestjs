-- CreateTable
CREATE TABLE `feature_flags` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `feature_flags_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
