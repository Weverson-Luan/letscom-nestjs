-- Conversa (chat) entre a equipe e a empresa do cliente: uma conversa por cliente.
-- CreateTable
CREATE TABLE `conversas_mensagens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `autor_id` BIGINT UNSIGNED NOT NULL,
    `conteudo` TEXT NOT NULL,
    `editada_em` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `conversas_mensagens_cliente_timeline_index`(`cliente_id`, `deleted_at`, `created_at`),
    INDEX `conversas_mensagens_autor_id_index`(`autor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversas_mensagens_anexos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `mensagem_id` BIGINT UNSIGNED NOT NULL,
    `nome_original` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `tamanho_bytes` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversas_mensagens_anexos_mensagem_id_index`(`mensagem_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conversas_mensagens` ADD CONSTRAINT `conversas_mensagens_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversas_mensagens` ADD CONSTRAINT `conversas_mensagens_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversas_mensagens_anexos` ADD CONSTRAINT `conversas_mensagens_anexos_mensagem_id_fkey` FOREIGN KEY (`mensagem_id`) REFERENCES `conversas_mensagens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
