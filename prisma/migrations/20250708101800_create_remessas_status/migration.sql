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

-- AddForeignKey
ALTER TABLE `remessas_status` ADD CONSTRAINT `remessas_status_remessa_id_fkey` FOREIGN KEY (`remessa_id`) REFERENCES `remessas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
