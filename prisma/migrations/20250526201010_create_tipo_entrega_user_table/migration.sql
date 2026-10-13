-- CreateTable
CREATE TABLE `tipo_entrega_user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `tipo_entrega_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tipo_entrega_user` ADD CONSTRAINT `tipo_entrega_user_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tipo_entrega_user` ADD CONSTRAINT `tipo_entrega_user_tipo_entrega_id_fkey` FOREIGN KEY (`tipo_entrega_id`) REFERENCES `tipos_entrega`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
