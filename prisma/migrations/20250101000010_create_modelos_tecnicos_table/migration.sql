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

-- AddForeignKey
ALTER TABLE `modelos_tecnicos` ADD CONSTRAINT `modelos_tecnicos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modelos_tecnicos` ADD CONSTRAINT `modelos_tecnicos_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modelos_tecnicos` ADD CONSTRAINT `modelos_tecnicos_tecnologia_id_fkey` FOREIGN KEY (`tecnologia_id`) REFERENCES `tecnologias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
