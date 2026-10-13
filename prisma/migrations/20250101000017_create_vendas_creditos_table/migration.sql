-- CreateTable
CREATE TABLE `vendas_creditos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `user_id_executor` BIGINT UNSIGNED NOT NULL,
    `produto_id` BIGINT UNSIGNED NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `quantidade_creditos` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('pendente', 'confirmado', 'cancelada', 'cancelado') NOT NULL DEFAULT 'pendente',
    `data_venda` DATETIME(3) NOT NULL,
    `tipo_transacao` ENUM('entrada', 'saida') NULL DEFAULT 'saida',
    `valor_total` DECIMAL(10, 2) NOT NULL,
    `observacao` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendas_creditos` ADD CONSTRAINT `vendas_creditos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendas_creditos` ADD CONSTRAINT `vendas_creditos_user_id_executor_fkey` FOREIGN KEY (`user_id_executor`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendas_creditos` ADD CONSTRAINT `vendas_creditos_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
