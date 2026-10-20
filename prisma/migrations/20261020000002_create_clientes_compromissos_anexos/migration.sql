-- Anexos (arquivos/imagens) enviados na criação de um compromisso da agenda do cliente.
-- O arquivo fica no storage (file_path); o nome original fica só no banco.
-- Exclusão lógica do compromisso não apaga anexos; exclusão física apaga em cascata.

-- CreateTable
CREATE TABLE `clientes_compromissos_anexos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `compromisso_id` BIGINT UNSIGNED NOT NULL,
    `nome_original` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `tamanho_bytes` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `clientes_compromissos_anexos_compromisso_id_index`(`compromisso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clientes_compromissos_anexos` ADD CONSTRAINT `clientes_compromissos_anexos_compromisso_id_fkey` FOREIGN KEY (`compromisso_id`) REFERENCES `clientes_compromissos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
