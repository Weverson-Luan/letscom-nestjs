-- Agenda do cliente: compromissos (ligação, reunião, visita...) registrados pela equipe.
-- O lado do cliente só vê os compromissos com visivel_cliente = 1.

-- CreateTable
CREATE TABLE `clientes_compromissos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `autor_id` BIGINT UNSIGNED NOT NULL,
    `responsavel_id` BIGINT UNSIGNED NULL,
    `tipo` ENUM('nota', 'ligacao', 'reuniao', 'email', 'whatsapp', 'visita', 'negociacao') NOT NULL DEFAULT 'nota',
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `agendado_para` DATETIME(3) NOT NULL,
    `status` ENUM('pendente', 'concluido', 'cancelado') NOT NULL DEFAULT 'pendente',
    `concluido_em` DATETIME(3) NULL,
    `visivel_cliente` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `clientes_compromissos_cliente_agenda_index`(`cliente_id`, `deleted_at`, `agendado_para`),
    INDEX `clientes_compromissos_responsavel_index`(`responsavel_id`, `status`, `agendado_para`),
    INDEX `clientes_compromissos_autor_id_index`(`autor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clientes_compromissos` ADD CONSTRAINT `clientes_compromissos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes_compromissos` ADD CONSTRAINT `clientes_compromissos_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes_compromissos` ADD CONSTRAINT `clientes_compromissos_responsavel_id_fkey` FOREIGN KEY (`responsavel_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
