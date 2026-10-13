-- CreateTable
CREATE TABLE `remessa_liberada_cliente` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `remessa_id` BIGINT UNSIGNED NOT NULL,
    `user_id_executor` BIGINT UNSIGNED NOT NULL,
    `tipo_entrega_id` BIGINT UNSIGNED NOT NULL,
    `file_path` VARCHAR(191) NULL,
    `data_entrega` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observacao` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `remessa_liberada_cliente` ADD CONSTRAINT `remessa_liberada_cliente_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_liberada_cliente` ADD CONSTRAINT `remessa_liberada_cliente_user_id_executor_fkey` FOREIGN KEY (`user_id_executor`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_liberada_cliente` ADD CONSTRAINT `remessa_liberada_cliente_tipo_entrega_id_fkey` FOREIGN KEY (`tipo_entrega_id`) REFERENCES `tipos_entrega`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
