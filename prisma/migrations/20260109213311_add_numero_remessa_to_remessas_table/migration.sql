-- AlterTable
ALTER TABLE `remessas` ADD COLUMN `numero_remessa` BIGINT UNSIGNED NOT NULL AFTER `observacao`;

-- CreateIndex
CREATE UNIQUE INDEX `remessas_numero_remessa_key` ON `remessas`(`numero_remessa`);
