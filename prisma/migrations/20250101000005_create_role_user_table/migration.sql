-- CreateTable
CREATE TABLE `role_user` (
    `user_id` BIGINT UNSIGNED NULL,
    `client_sub_id` BIGINT UNSIGNED NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `role_user_user_id_foreign`(`user_id`),
    INDEX `role_user_client_sub_id_foreign`(`client_sub_id`),
    INDEX `role_user_role_id_foreign`(`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
