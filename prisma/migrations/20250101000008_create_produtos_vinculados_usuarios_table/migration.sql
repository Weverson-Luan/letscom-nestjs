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

-- AddForeignKey
ALTER TABLE `produtos_vinculados_usuarios` ADD CONSTRAINT `produtos_vinculados_usuarios_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produtos_vinculados_usuarios` ADD CONSTRAINT `produtos_vinculados_usuarios_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
