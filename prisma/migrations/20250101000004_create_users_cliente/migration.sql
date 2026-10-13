-- CreateTable
CREATE TABLE `users_cliente` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NULL,
    `senha` VARCHAR(191) NOT NULL,
    `documento` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_cliente_email_key`(`email`),
    UNIQUE INDEX `users_cliente_documento_key`(`documento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users_cliente` ADD CONSTRAINT `users_cliente_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
