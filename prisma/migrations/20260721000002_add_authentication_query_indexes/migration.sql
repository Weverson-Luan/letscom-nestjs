-- CreateIndex
CREATE INDEX `role_user_user_role_index` ON `role_user`(`user_id`, `role_id`);

-- CreateIndex
CREATE INDEX `role_user_subordinado_role_index` ON `role_user`(`client_sub_id`, `role_id`);
