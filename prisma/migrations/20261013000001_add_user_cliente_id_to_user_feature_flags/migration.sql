-- DropForeignKey
ALTER TABLE `user_feature_flags` DROP FOREIGN KEY `user_feature_flags_user_id_fkey`;

-- AlterTable: vínculo passa a ser de user OU user_cliente
ALTER TABLE `user_feature_flags`
    MODIFY `user_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `user_cliente_id` BIGINT UNSIGNED NULL AFTER `user_id`;

-- CreateIndex
CREATE UNIQUE INDEX `user_feature_flags_user_cliente_id_feature_flag_id_key` ON `user_feature_flags`(`user_cliente_id`, `feature_flag_id`);

-- AddForeignKey
ALTER TABLE `user_feature_flags` ADD CONSTRAINT `user_feature_flags_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_feature_flags` ADD CONSTRAINT `user_feature_flags_user_cliente_id_fkey` FOREIGN KEY (`user_cliente_id`) REFERENCES `users_cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
