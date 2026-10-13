-- CreateIndex
CREATE INDEX `remessas_status_index` ON `remessas`(`status`);

-- CreateIndex
CREATE INDEX `remessas_user_id_executor_index` ON `remessas`(`user_id_executor`);

-- CreateIndex
CREATE INDEX `remessas_situacao_index` ON `remessas`(`situacao`);

-- CreateIndex
CREATE INDEX `remessas_status_executor_index` ON `remessas`(`status`, `user_id_executor`);

-- CreateIndex
CREATE INDEX `remessas_created_at_index` ON `remessas`(`created_at`);

-- CreateIndex
CREATE INDEX `vendas_creditos_cliente_status_index` ON `vendas_creditos`(`cliente_id`, `status`);
