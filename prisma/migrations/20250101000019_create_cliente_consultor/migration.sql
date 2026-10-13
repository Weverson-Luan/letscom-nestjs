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

-- AddForeignKey
ALTER TABLE `cliente_consultor` ADD CONSTRAINT `cliente_consultor_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cliente_consultor` ADD CONSTRAINT `cliente_consultor_consultor_id_fkey` FOREIGN KEY (`consultor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
