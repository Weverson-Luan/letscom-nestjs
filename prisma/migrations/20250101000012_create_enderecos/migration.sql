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

-- AddForeignKey
ALTER TABLE `enderecos` ADD CONSTRAINT `enderecos_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
