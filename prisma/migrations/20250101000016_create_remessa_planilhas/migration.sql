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

-- AddForeignKey
ALTER TABLE `remessa_planilhas` ADD CONSTRAINT `remessa_planilhas_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessa_planilhas` ADD CONSTRAINT `remessa_planilhas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
