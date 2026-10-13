-- CreateTable
CREATE TABLE `tecnologias` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `tecnologias_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
