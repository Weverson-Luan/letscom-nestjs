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

-- AddForeignKey
ALTER TABLE `modelos_tecnicos_campos_variaveis` ADD CONSTRAINT `modelos_tecnicos_campos_variaveis_modelo_tecnico_id_fkey` FOREIGN KEY (`modelo_tecnico_id`) REFERENCES `modelos_tecnicos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
