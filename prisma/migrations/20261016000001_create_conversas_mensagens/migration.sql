-- CreateTable
CREATE TABLE `clientes_anotacoes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `autor_id` BIGINT UNSIGNED NOT NULL,
    `tipo` ENUM('nota', 'ligacao', 'reuniao', 'email', 'whatsapp', 'visita', 'negociacao') NOT NULL DEFAULT 'nota',
    `conteudo` TEXT NOT NULL,
    `editada_em` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `clientes_anotacoes_cliente_timeline_index`(`cliente_id`, `deleted_at`, `created_at`),
    INDEX `clientes_anotacoes_autor_id_index`(`autor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes_anotacoes_anexos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `anotacao_id` BIGINT UNSIGNED NOT NULL,
    `nome_original` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `tamanho_bytes` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `clientes_anotacoes_anexos_anotacao_id_index`(`anotacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clientes_anotacoes` ADD CONSTRAINT `clientes_anotacoes_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes_anotacoes` ADD CONSTRAINT `clientes_anotacoes_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes_anotacoes_anexos` ADD CONSTRAINT `clientes_anotacoes_anexos_anotacao_id_fkey` FOREIGN KEY (`anotacao_id`) REFERENCES `clientes_anotacoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
