-- Histórico de status passa a registrar quem fez a mudança (usuário interno).
-- Linhas existentes e as gravadas pelo Laravel ficam com user_id NULL.

-- AlterTable
ALTER TABLE `remessas_status` ADD COLUMN `user_id` BIGINT UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `remessas_status_user_id_index` ON `remessas_status`(`user_id`);

-- AddForeignKey
ALTER TABLE `remessas_status` ADD CONSTRAINT `remessas_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
