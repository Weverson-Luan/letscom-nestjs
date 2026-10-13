-- AlterTable
ALTER TABLE `remessas` ADD COLUMN `users_solicitante_subordinado_id` BIGINT UNSIGNED NULL;

-- AddForeignKey
ALTER TABLE `remessas` ADD CONSTRAINT `remessas_users_solicitante_subordinado_id_fkey` FOREIGN KEY (`users_solicitante_subordinado_id`) REFERENCES `users_cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
