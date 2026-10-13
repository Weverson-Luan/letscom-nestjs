-- AlterTable
ALTER TABLE `feature_flags` ADD COLUMN `tipo_usuario` VARCHAR(191) NULL AFTER `descricao`;

-- CreateIndex
CREATE INDEX `feature_flags_tipo_usuario_idx` ON `feature_flags`(`tipo_usuario`);
