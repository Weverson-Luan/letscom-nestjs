-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `documento` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `tipo_pessoa` ENUM('F', 'J') NOT NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_documento_key`(`documento`),
    UNIQUE INDEX `users_telefone_key`(`telefone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
