-- CreateTable
CREATE TABLE `produtos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `valor_creditos` DECIMAL(10, 2) NOT NULL,
    `estoque_minimo` INTEGER NOT NULL,
    `estoque_maximo` INTEGER NOT NULL,
    `estoque_atual` INTEGER NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
