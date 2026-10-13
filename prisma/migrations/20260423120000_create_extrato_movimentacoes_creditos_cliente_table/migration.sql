-- CreateTable
CREATE TABLE `extrato_movimentacoes_creditos_cliente` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `produto_id` BIGINT UNSIGNED NOT NULL,
    `tipo_operacao` VARCHAR(64) NOT NULL,
    `direcao_movimento` VARCHAR(16) NOT NULL,
    `quantidade_creditos` DECIMAL(10, 2) NOT NULL,
    `saldo_creditos_produto_apos_movimento` BIGINT UNSIGNED NOT NULL,
    `remessa_id` BIGINT UNSIGNED NULL,
    `venda_credito_id` BIGINT UNSIGNED NULL,
    `user_id_responsavel` BIGINT UNSIGNED NULL,
    `observacao_negocio` TEXT NULL,
    `detalhes_operacao` JSON NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `emcc_idx_cli_criado`(`cliente_id`, `created_at`),
    INDEX `emcc_idx_cli_prod_criado`(`cliente_id`, `produto_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `extrato_movimentacoes_creditos_cliente` ADD CONSTRAINT `emcc_fk_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extrato_movimentacoes_creditos_cliente` ADD CONSTRAINT `emcc_fk_produto` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extrato_movimentacoes_creditos_cliente` ADD CONSTRAINT `emcc_fk_remessa` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extrato_movimentacoes_creditos_cliente` ADD CONSTRAINT `emcc_fk_venda_cred` FOREIGN KEY (`venda_credito_id`) REFERENCES `vendas_creditos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extrato_movimentacoes_creditos_cliente` ADD CONSTRAINT `emcc_fk_user_resp` FOREIGN KEY (`user_id_responsavel`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
