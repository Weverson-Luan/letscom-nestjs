import { Injectable } from '@nestjs/common';
import { ResponsavelCompromissoInvalidoException } from '../exceptions/responsavel-compromisso-invalido.exception';
import { ResponsavelCompromissoRepository } from '../repositories/responsavel-compromisso.repository';

/** `responsavelId` = interno ou o próprio cliente (users.id); `responsavelSubordinadoId` = users_cliente.id. */
export type ResponsavelEscolhido = {
  responsavelId: bigint | null;
  responsavelSubordinadoId: bigint | null;
};

/**
 * Service técnico compartilhado: garante que o responsável escolhido pode cuidar de compromissos
 * do cliente (equipe ativa, o próprio cliente ou um subordinado ativo dele). Fora da regra: 400.
 */
@Injectable()
export class ValidacaoResponsavelCompromissoService {
  constructor(private readonly repository: ResponsavelCompromissoRepository) {}

  async validar(
    clienteId: bigint,
    { responsavelId, responsavelSubordinadoId }: ResponsavelEscolhido,
  ): Promise<void> {
    const valido =
      responsavelSubordinadoId !== null
        ? await this.repository.ehSubordinadoAtivoDoCliente(clienteId, responsavelSubordinadoId)
        : responsavelId === null ||
          responsavelId === clienteId ||
          (await this.repository.ehUsuarioInternoAtivo(responsavelId));
    if (!valido) throw new ResponsavelCompromissoInvalidoException();
  }
}
