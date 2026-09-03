-- CreateTable
CREATE TABLE `entregas_cliente` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `remessa_id` BIGINT UNSIGNED NOT NULL,
    `responsavel_recebimento` VARCHAR(191) NOT NULL,
    `imagem_protocolo` VARCHAR(191) NULL,
    `data_entrega` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `entregas_cliente_remessa_id_idx`(`remessa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users_atendimentos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `nome` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `documento` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_atendimentos_email_key`(`email`),
    INDEX `users_atendimentos_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `entregas_cliente` ADD CONSTRAINT `entregas_cliente_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_atendimentos` ADD CONSTRAINT `users_atendimentos_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
