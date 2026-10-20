import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { mapearParticipanteConversa } from '../mappers/participante-conversa.mapper';
import {
  ConversaParticipanteRepository,
  ParticipanteComPessoa,
} from '../repositories/conversa-participante.repository';
import {
  montarPessoaDoUsuario,
  validarDonoConversa,
  validarGestaoParticipante,
} from './helpers/participante-conversa.helper';

/** Um dos donos devolve o acesso a um participante inativado (volta direto como aceito). */
@Injectable()
export class ReativarParticipanteConversaService {
  constructor(private readonly repository: ConversaParticipanteRepository) {}

  async execute(clienteId: bigint, participanteId: bigint, usuario: AuthUser) {
    const dono = validarDonoConversa(
      await this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario)),
    );
    const participante = validarGestaoParticipante({
      dono,
      participante: await this.repository.buscarPorId(participanteId),
      clienteId,
      acao: 'reativar',
    });
    if (participante.status !== 'inativo') {
      throw new ParticipanteConversaInvalidoException(
        'Só é possível reativar quem está com o acesso inativo.',
      );
    }
    if (!(await this.ehCadastroAtivo(clienteId, participante))) {
      throw new ParticipanteConversaInvalidoException(
        'Não é possível reativar: o cadastro desta pessoa está desativado.',
      );
    }

    // update condicional: outro dono pode ter reativado ao mesmo tempo
    const alterado = await this.repository.alterarStatus(participanteId, 'inativo', {
      status: 'aceito',
      inativadoEm: null,
    });
    if (!alterado) {
      throw new ParticipanteConversaInvalidoException('Este participante já foi reativado.');
    }

    const atualizado = await this.repository.buscarPorId(participanteId);
    return mapearParticipanteConversa(atualizado ?? participante, usuario);
  }

  /** O cadastro ainda está ativo (operador, cliente principal ou subordinado da empresa). */
  private async ehCadastroAtivo(
    clienteId: bigint,
    participante: ParticipanteComPessoa,
  ): Promise<boolean> {
    if (participante.subordinadoId !== null) {
      return this.repository.ehSubordinadoAtivoDoCliente(clienteId, participante.subordinadoId);
    }
    if (participante.userId === clienteId) {
      return this.repository.ehClientePrincipalAtivo(clienteId);
    }
    return participante.userId !== null && this.repository.ehInternoAtivo(participante.userId);
  }
}
