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
    `data_inicio_producao` DATETIME(3) NULL,
    `data_fim_producao` DATETIME(3) NULL,
    `posicao` ENUM('H', 'V') NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_consultor_id_fkey` FOREIGN KEY (`consultor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_user_id_solicitante_remessa_fkey` FOREIGN KEY (`user_id_solicitante_remessa`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_user_id_executor_fkey` FOREIGN KEY (`user_id_executor`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_modelo_tecnico_id_fkey` FOREIGN KEY (`modelo_tecnico_id`) REFERENCES `modelos_tecnicos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_tecnologia_id_fkey` FOREIGN KEY (`tecnologia_id`) REFERENCES `tecnologias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
