-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `email` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
