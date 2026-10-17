-- Anotação passa a aceitar autor do lado do cliente (cliente principal ou subordinado).
-- Linhas existentes ficam com autor_tipo = 'interno' (default) e autor_id preenchido.

-- DropForeignKey (recriada abaixo; necessário para tornar autor_id anulável)
ALTER TABLE `clientes_anotacoes` DROP FOREIGN KEY `clientes_anotacoes_autor_id_fkey`;

-- AlterTable
ALTER TABLE `clientes_anotacoes`
    MODIFY `autor_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `autor_subordinado_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `autor_tipo` ENUM('interno', 'cliente', 'subordinado') NOT NULL DEFAULT 'interno';

-- CreateIndex
CREATE INDEX `clientes_anotacoes_autor_subordinado_id_index` ON `clientes_anotacoes`(`autor_subordinado_id`);

-- CreateTable
CREATE TABLE `notificacoes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `destinatario_user_id` BIGINT UNSIGNED NULL,
    `destinatario_subordinado_id` BIGINT UNSIGNED NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` VARCHAR(500) NOT NULL,
    `link` VARCHAR(500) NULL,
    `anotacao_id` BIGINT UNSIGNED NULL,
    `lida_em` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificacoes_user_caixa_index`(`destinatario_user_id`, `lida_em`, `created_at`),
    INDEX `notificacoes_subordinado_caixa_index`(`destinatario_subordinado_id`, `lida_em`, `created_at`),
    INDEX `notificacoes_anotacao_id_index`(`anotacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clientes_anotacoes` ADD CONSTRAINT `clientes_anotacoes_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes_anotacoes` ADD CONSTRAINT `clientes_anotacoes_autor_subordinado_id_fkey` FOREIGN KEY (`autor_subordinado_id`) REFERENCES `users_cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_destinatario_user_id_fkey` FOREIGN KEY (`destinatario_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_destinatario_subordinado_id_fkey` FOREIGN KEY (`destinatario_subordinado_id`) REFERENCES `users_cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_anotacao_id_fkey` FOREIGN KEY (`anotacao_id`) REFERENCES `clientes_anotacoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
