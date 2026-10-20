-- Agenda do cliente: o responsável pode ser também um subordinado do cliente (users_cliente).
-- O cliente principal continua em `responsavel_id` (é um users.id); as duas colunas são exclusivas.

-- AlterTable
ALTER TABLE `clientes_compromissos` ADD COLUMN `responsavel_subordinado_id` BIGINT UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `clientes_compromissos_responsavel_subordinado_id_index` ON `clientes_compromissos`(`responsavel_subordinado_id`);

-- AddForeignKey
ALTER TABLE `clientes_compromissos` ADD CONSTRAINT `clientes_compromissos_responsavel_subordinado_id_fkey` FOREIGN KEY (`responsavel_subordinado_id`) REFERENCES `users_cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
