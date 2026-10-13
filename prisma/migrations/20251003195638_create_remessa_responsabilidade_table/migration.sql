-- CreateTable
CREATE TABLE `remessa_responsabilidade` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `documento` VARCHAR(20) NOT NULL,
    `data_ciencia` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `remessa_responsabilidade` ADD CONSTRAINT `remessa_responsabilidade_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
