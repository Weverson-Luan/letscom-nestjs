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
    INDEX `users_created_at_index`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `roles_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `client_sub_id` BIGINT UNSIGNED NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cliente_consultor` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `consultor_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `cliente_consultor_cliente_id_consultor_id_key`(`cliente_id`, `consultor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `produtos_vinculados_usuarios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `produto_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `produtos_vinculados_usuarios_cliente_id_produto_id_key`(`cliente_id`, `produto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modelos_tecnicos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `produto_id` BIGINT UNSIGNED NOT NULL,
    `tecnologia_id` BIGINT UNSIGNED NOT NULL,
    `nome_modelo` VARCHAR(100) NULL,
    `posicionamento` ENUM('horizontal', 'vertical') NULL,
    `tem_furo` BOOLEAN NOT NULL DEFAULT false,
    `tem_carga_foto` BOOLEAN NOT NULL DEFAULT false,
    `tem_dados_variaveis` BOOLEAN NOT NULL DEFAULT false,
    `is_provisorio` BOOLEAN NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `tipo_furo` ENUM('ovoide', 'redondo') NULL,
    `campo_chave` VARCHAR(50) NULL,
    `foto_frente_path` VARCHAR(255) NULL,
    `foto_verso_path` VARCHAR(255) NULL,
    `observacoes` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modelos_tecnicos_campos_variaveis` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `modelo_tecnico_id` BIGINT UNSIGNED NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `obrigatorio` BOOLEAN NOT NULL DEFAULT false,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enderecos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `logradouro` VARCHAR(191) NULL,
    `numero` VARCHAR(191) NOT NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NOT NULL,
    `cidade` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `cep` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `tipo_endereco` ENUM('residencial', 'entrega', 'cobranca', 'outro') NOT NULL DEFAULT 'residencial',
    `nome_responsavel` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `setor` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_entrega` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('balcao', 'correios', 'motoboy_letscom', 'transportadora', 'outros') NULL DEFAULT 'motoboy_letscom',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipo_entrega_user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `tipo_entrega_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remessas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `user_id_solicitante_remessa` BIGINT UNSIGNED NULL,
    `user_id_executor` BIGINT UNSIGNED NULL,
    `consultor_id` BIGINT UNSIGNED NULL,
    `modelo_tecnico_id` BIGINT UNSIGNED NOT NULL,
    `tecnologia_id` BIGINT UNSIGNED NOT NULL,
    `total_solicitacoes` INTEGER NOT NULL DEFAULT 0,
    `situacao` ENUM('solicitado', 'pendente', 'pedido_liberado', 'em_producao', 'em_aprovacao', 'pronto para imprimir', 'concluida', 'cancelada', 'concluido', 'conferido', 'error', 'duplicidade', 'a fazer', 'a aprovar', 'enviar pdf') NOT NULL DEFAULT 'solicitado',
    `status` VARCHAR(191) NOT NULL DEFAULT 'solicitado',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `observacao` VARCHAR(191) NULL,
    `numero_remessa` BIGINT UNSIGNED NOT NULL,
    `data_inicio_producao` DATETIME(3) NULL,
    `data_fim_producao` DATETIME(3) NULL,
    `posicao` ENUM('H', 'V') NULL,
    `users_solicitante_subordinado_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `remessas_numero_remessa_key`(`numero_remessa`),
    INDEX `remessas_status_index`(`status`),
    INDEX `remessas_user_id_executor_index`(`user_id_executor`),
    INDEX `remessas_situacao_index`(`situacao`),
    INDEX `remessas_status_executor_index`(`status`, `user_id_executor`),
    INDEX `remessas_created_at_index`(`created_at`),
    INDEX `remessas_cliente_created_index`(`cliente_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remessa_fotos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `remessa_id` BIGINT UNSIGNED NOT NULL,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NULL,
    `matricula` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remessa_planilhas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `remessa_id` BIGINT UNSIGNED NOT NULL,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remessas_status` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `remessa_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('envio_de_dados', 'em_producao', 'conferido', 'pedido_liberado', 'concluido') NOT NULL,
    `data_status` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remessa_liberada_balcao` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `remessa_id` BIGINT UNSIGNED NOT NULL,
    `user_id_executor` BIGINT UNSIGNED NOT NULL,
    `tipo_entrega_id` BIGINT UNSIGNED NOT NULL,
    `data_entrega` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observacao` TEXT NULL,
    `outros` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remessa_liberada_cliente` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `remessa_id` BIGINT UNSIGNED NOT NULL,
    `user_id_executor` BIGINT UNSIGNED NOT NULL,
    `tipo_entrega_id` BIGINT UNSIGNED NOT NULL,
    `file_path` VARCHAR(191) NULL,
    `data_entrega` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observacao` TEXT NULL,
    `outros` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

    INDEX `vendas_creditos_cliente_status_index`(`cliente_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `feature_flags` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `tipo_usuario` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `feature_flags_key_key`(`key`),
    INDEX `feature_flags_tipo_usuario_idx`(`tipo_usuario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_feature_flags` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `feature_flag_id` BIGINT UNSIGNED NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `user_feature_flags_user_id_feature_flag_id_key`(`user_id`, `feature_flag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tokenable_type` VARCHAR(191) NOT NULL,
    `tokenable_id` BIGINT UNSIGNED NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_tokenable_type_tokenable_id_index`(`tokenable_type`, `tokenable_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `email` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `user_tipo` VARCHAR(191) NULL,
    `user_nome` VARCHAR(191) NULL,
    `evento` VARCHAR(191) NOT NULL,
    `metodo` VARCHAR(191) NULL,
    `rota` TEXT NULL,
    `status_code` SMALLINT UNSIGNED NULL,
    `ip` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `payload` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_user_id_idx`(`user_id`),
    INDEX `activity_logs_evento_idx`(`evento`),
    INDEX `activity_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users_cliente` ADD CONSTRAINT `users_cliente_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_user` ADD CONSTRAINT `role_user_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_user` ADD CONSTRAINT `role_user_client_sub_id_fkey` FOREIGN KEY (`client_sub_id`) REFERENCES `users_cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_user` ADD CONSTRAINT `role_user_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cliente_consultor` ADD CONSTRAINT `cliente_consultor_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cliente_consultor` ADD CONSTRAINT `cliente_consultor_consultor_id_fkey` FOREIGN KEY (`consultor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produtos_vinculados_usuarios` ADD CONSTRAINT `produtos_vinculados_usuarios_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produtos_vinculados_usuarios` ADD CONSTRAINT `produtos_vinculados_usuarios_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modelos_tecnicos` ADD CONSTRAINT `modelos_tecnicos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modelos_tecnicos` ADD CONSTRAINT `modelos_tecnicos_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modelos_tecnicos` ADD CONSTRAINT `modelos_tecnicos_tecnologia_id_fkey` FOREIGN KEY (`tecnologia_id`) REFERENCES `tecnologias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modelos_tecnicos_campos_variaveis` ADD CONSTRAINT `modelos_tecnicos_campos_variaveis_modelo_tecnico_id_fkey` FOREIGN KEY (`modelo_tecnico_id`) REFERENCES `modelos_tecnicos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enderecos` ADD CONSTRAINT `enderecos_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tipo_entrega_user` ADD CONSTRAINT `tipo_entrega_user_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tipo_entrega_user` ADD CONSTRAINT `tipo_entrega_user_tipo_entrega_id_fkey` FOREIGN KEY (`tipo_entrega_id`) REFERENCES `tipos_entrega`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_consultor_id_fkey` FOREIGN KEY (`consultor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_user_id_solicitante_remessa_fkey` FOREIGN KEY (`user_id_solicitante_remessa`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_user_id_executor_fkey` FOREIGN KEY (`user_id_executor`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_users_solicitante_subordinado_id_fkey` FOREIGN KEY (`users_solicitante_subordinado_id`) REFERENCES `users_cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_modelo_tecnico_id_fkey` FOREIGN KEY (`modelo_tecnico_id`) REFERENCES `modelos_tecnicos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_tecnologia_id_fkey` FOREIGN KEY (`tecnologia_id`) REFERENCES `tecnologias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_fotos` ADD CONSTRAINT `remessa_fotos_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_fotos` ADD CONSTRAINT `remessa_fotos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_planilhas` ADD CONSTRAINT `remessa_planilhas_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_planilhas` ADD CONSTRAINT `remessa_planilhas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas_status` ADD CONSTRAINT `remessas_status_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_liberada_balcao` ADD CONSTRAINT `remessa_liberada_balcao_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_liberada_balcao` ADD CONSTRAINT `remessa_liberada_balcao_user_id_executor_fkey` FOREIGN KEY (`user_id_executor`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_liberada_balcao` ADD CONSTRAINT `remessa_liberada_balcao_tipo_entrega_id_fkey` FOREIGN KEY (`tipo_entrega_id`) REFERENCES `tipos_entrega`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_liberada_cliente` ADD CONSTRAINT `remessa_liberada_cliente_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_liberada_cliente` ADD CONSTRAINT `remessa_liberada_cliente_user_id_executor_fkey` FOREIGN KEY (`user_id_executor`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_liberada_cliente` ADD CONSTRAINT `remessa_liberada_cliente_tipo_entrega_id_fkey` FOREIGN KEY (`tipo_entrega_id`) REFERENCES `tipos_entrega`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_responsabilidade` ADD CONSTRAINT `remessa_responsabilidade_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendas_creditos` ADD CONSTRAINT `vendas_creditos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendas_creditos` ADD CONSTRAINT `vendas_creditos_user_id_executor_fkey` FOREIGN KEY (`user_id_executor`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendas_creditos` ADD CONSTRAINT `vendas_creditos_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `user_feature_flags` ADD CONSTRAINT `user_feature_flags_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_feature_flags` ADD CONSTRAINT `user_feature_flags_feature_flag_id_fkey` FOREIGN KEY (`feature_flag_id`) REFERENCES `feature_flags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
