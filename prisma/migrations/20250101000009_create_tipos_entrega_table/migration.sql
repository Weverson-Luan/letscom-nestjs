-- CreateTable
CREATE TABLE `tipos_entrega` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('balcao', 'correios', 'motoboy_letscom', 'transportadora', 'outros') NULL DEFAULT 'motoboy_letscom',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
