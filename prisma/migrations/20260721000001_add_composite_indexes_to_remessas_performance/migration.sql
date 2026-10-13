-- CreateIndex
CREATE INDEX `remessas_disponiveis_status_executor_deleted_created_index` ON `remessas`(`status`, `user_id_executor`, `deleted_at`, `created_at`);

-- CreateIndex
CREATE INDEX `remessas_status_deleted_index` ON `remessas`(`status`, `deleted_at`);
