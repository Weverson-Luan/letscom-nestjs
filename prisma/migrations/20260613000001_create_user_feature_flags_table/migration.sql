-- CreateTable
CREATE TABLE `user_feature_flags` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `feature_flag_id` BIGINT UNSIGNED NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `user_feature_flags_user_id_feature_flag_id_key`(`user_id`, `feature_flag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_feature_flags` ADD CONSTRAINT `user_feature_flags_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_feature_flags` ADD CONSTRAINT `user_feature_flags_feature_flag_id_fkey` FOREIGN KEY (`feature_flag_id`) REFERENCES `feature_flags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
