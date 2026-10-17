-- Conversa do cliente passa a ser fechada: só os dois donos (operador que iniciou + pessoa do
-- cliente com quem ele iniciou) e quem eles convidarem (convite aceito) leem e escrevem.
-- Admin continua com acesso total (regra na API, não no banco).
-- "Exatamente um entre user_id e subordinado_id" fica na API: o MySQL 8 não aceita CHECK em
-- colunas com FK ON DELETE CASCADE (erro 3823).

-- CreateTable
CREATE TABLE `conversa_participantes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cliente_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `subordinado_id` BIGINT UNSIGNED NULL,
    `papel` ENUM('dono', 'convidado') NOT NULL DEFAULT 'convidado',
    `status` ENUM('pendente', 'aceito', 'recusado') NOT NULL DEFAULT 'pendente',
    `convidado_por_user_id` BIGINT UNSIGNED NULL,
    `convidado_por_subordinado_id` BIGINT UNSIGNED NULL,
    `respondido_em` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conversa_participantes_cliente_user_unique`(`cliente_id`, `user_id`),
    UNIQUE INDEX `conversa_participantes_cliente_subordinado_unique`(`cliente_id`, `subordinado_id`),
    INDEX `conversa_participantes_user_id_index`(`user_id`),
    INDEX `conversa_participantes_subordinado_id_index`(`subordinado_id`),
    INDEX `conversa_participantes_convidado_por_user_id_index`(`convidado_por_user_id`),
    INDEX `conversa_participantes_convidado_por_subordinado_id_index`(`convidado_por_subordinado_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `notificacoes` ADD COLUMN `participante_id` BIGINT UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `notificacoes_participante_id_index` ON `notificacoes`(`participante_id`);

-- AddForeignKey
ALTER TABLE `conversa_participantes` ADD CONSTRAINT `conversa_participantes_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversa_participantes` ADD CONSTRAINT `conversa_participantes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversa_participantes` ADD CONSTRAINT `conversa_participantes_subordinado_id_fkey` FOREIGN KEY (`subordinado_id`) REFERENCES `users_cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversa_participantes` ADD CONSTRAINT `conversa_participantes_convidado_por_user_id_fkey` FOREIGN KEY (`convidado_por_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversa_participantes` ADD CONSTRAINT `conversa_participantes_convidado_por_subordinado_id_fkey` FOREIGN KEY (`convidado_por_subordinado_id`) REFERENCES `users_cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_participante_id_fkey` FOREIGN KEY (`participante_id`) REFERENCES `conversa_participantes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Backfill das conversas existentes (inclui mensagens excluídas: o autor participou).
-- =====================================================================

-- 1. Dono interno: autor da primeira mensagem interna do cliente que ainda está ativo
--    (operador desativado não pode ser dono: travaria a conversa para a equipe).
INSERT INTO `conversa_participantes` (`cliente_id`, `user_id`, `papel`, `status`, `respondido_em`, `updated_at`)
SELECT a.`cliente_id`, a.`autor_id`, 'dono', 'aceito', NOW(3), NOW(3)
FROM `clientes_anotacoes` a
WHERE a.`id` IN (
    SELECT MIN(a2.`id`) FROM `clientes_anotacoes` a2
    INNER JOIN `users` u ON u.`id` = a2.`autor_id` AND u.`ativo` = 1 AND u.`deleted_at` IS NULL
    WHERE a2.`autor_tipo` = 'interno'
    GROUP BY a2.`cliente_id`
);

-- 2. Dono do lado do cliente: autor da primeira mensagem do cliente principal ou de um subordinado.
INSERT INTO `conversa_participantes` (`cliente_id`, `user_id`, `subordinado_id`, `papel`, `status`, `respondido_em`, `updated_at`)
SELECT a.`cliente_id`,
    IF(a.`autor_tipo` = 'cliente', a.`autor_id`, NULL),
    IF(a.`autor_tipo` = 'subordinado', a.`autor_subordinado_id`, NULL),
    'dono', 'aceito', NOW(3), NOW(3)
FROM `clientes_anotacoes` a
WHERE a.`id` IN (
    SELECT MIN(a2.`id`) FROM `clientes_anotacoes` a2
    WHERE (a2.`autor_tipo` = 'cliente' AND a2.`autor_id` IS NOT NULL)
       OR (a2.`autor_tipo` = 'subordinado' AND a2.`autor_subordinado_id` IS NOT NULL)
    GROUP BY a2.`cliente_id`
);

-- 3. Cliente ainda não escreveu: o cliente principal vira o dono do lado do cliente.
INSERT INTO `conversa_participantes` (`cliente_id`, `user_id`, `papel`, `status`, `respondido_em`, `updated_at`)
SELECT c.`cliente_id`, c.`cliente_id`, 'dono', 'aceito', NOW(3), NOW(3)
FROM (SELECT DISTINCT `cliente_id` FROM `clientes_anotacoes`) c
WHERE NOT EXISTS (
    SELECT 1 FROM `conversa_participantes` p
    WHERE p.`cliente_id` = c.`cliente_id` AND p.`papel` = 'dono'
      AND (p.`subordinado_id` IS NOT NULL OR p.`user_id` = c.`cliente_id`)
);

-- 4. Nenhum interno ativo escreveu: o consultor vinculado ativo (o de menor id) vira o dono
--    interno. Sem nenhum, a conversa fica sem dono interno e o primeiro interno que escrever assume.
INSERT INTO `conversa_participantes` (`cliente_id`, `user_id`, `papel`, `status`, `respondido_em`, `updated_at`)
SELECT cc.`cliente_id`, MIN(cc.`consultor_id`), 'dono', 'aceito', NOW(3), NOW(3)
FROM `cliente_consultor` cc
INNER JOIN `users` u ON u.`id` = cc.`consultor_id` AND u.`ativo` = 1 AND u.`deleted_at` IS NULL
WHERE cc.`cliente_id` IN (SELECT DISTINCT `cliente_id` FROM `clientes_anotacoes`)
  AND NOT EXISTS (
    SELECT 1 FROM `conversa_participantes` p
    WHERE p.`cliente_id` = cc.`cliente_id` AND p.`papel` = 'dono'
      AND p.`user_id` IS NOT NULL AND p.`user_id` <> cc.`cliente_id`
  )
GROUP BY cc.`cliente_id`;

-- 5. Quem mais já escreveu entra como convidado com convite aceito.
INSERT INTO `conversa_participantes` (`cliente_id`, `user_id`, `papel`, `status`, `respondido_em`, `updated_at`)
SELECT DISTINCT a.`cliente_id`, a.`autor_id`, 'convidado', 'aceito', NOW(3), NOW(3)
FROM `clientes_anotacoes` a
WHERE a.`autor_tipo` IN ('interno', 'cliente') AND a.`autor_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `conversa_participantes` p
    WHERE p.`cliente_id` = a.`cliente_id` AND p.`user_id` = a.`autor_id`
  );

INSERT INTO `conversa_participantes` (`cliente_id`, `subordinado_id`, `papel`, `status`, `respondido_em`, `updated_at`)
SELECT DISTINCT a.`cliente_id`, a.`autor_subordinado_id`, 'convidado', 'aceito', NOW(3), NOW(3)
FROM `clientes_anotacoes` a
WHERE a.`autor_tipo` = 'subordinado' AND a.`autor_subordinado_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `conversa_participantes` p
    WHERE p.`cliente_id` = a.`cliente_id` AND p.`subordinado_id` = a.`autor_subordinado_id`
  );
