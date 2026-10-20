-- Dono da conversa passa a desativar o acesso de um participante em vez de removê-lo:
-- a linha fica com status = 'inativo' e pode ser reativada sem novo convite.

-- AlterTable
ALTER TABLE `conversa_participantes`
    MODIFY `status` ENUM('pendente', 'aceito', 'recusado', 'inativo') NOT NULL DEFAULT 'pendente',
    ADD COLUMN `inativado_em` DATETIME(3) NULL;
