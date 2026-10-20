import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { MAXIMO_CANDIDATOS_CONVITE } from '../conversas-clientes.constants';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { mapearCandidatoConvite } from '../mappers/participante-conversa.mapper';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import {
  ladoDoParticipante,
  ladoDoUsuario,
  montarPessoaDoUsuario,
  validarDonoConversa,
} from './helpers/participante-conversa.helper';

/**
 * Quem o dono pode convidar: o operador vê a equipe e o lado do cliente; o dono do lado do
 * cliente vê só a própria empresa. Já participantes e convites pendentes ficam de fora.
 * Antes de a conversa ser iniciada, a equipe vê o lado do cliente para escolher com quem iniciar.
 */
@Injectable()
export class ListarCandidatosConviteConversaService {
  constructor(
    private readonly repository: ConversaParticipanteRepository,
    private readonly mensagemRepository: ConversaMensagemRepository,
  ) {}

  async execute(clienteId: bigint, search: string | undefined, usuario: AuthUser) {
    // sem isso, um `clienteId` de interno/admin devolveria o nome e o e-mail dele
    if (!(await this.mensagemRepository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    const params = {
      clienteId,
      search: search?.trim() || undefined,
      take: MAXIMO_CANDIDATOS_CONVITE,
    };

    let incluirInternos = false;
    const donos = await this.repository.listarDonos(clienteId);
    if (donos.length > 0 || ladoDoUsuario(usuario, clienteId) === 'cliente') {
      const dono = validarDonoConversa(
        await this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario)),
      );
      incluirInternos = ladoDoParticipante(dono, clienteId) === 'interno';
    }

    const [ladoCliente, internos] = await Promise.all([
      this.repository.listarCandidatosLadoCliente(params),
      incluirInternos ? this.repository.listarCandidatosInternos(params) : Promise.resolve([]),
    ]);

    return [
      ...ladoCliente.map((candidato) => mapearCandidatoConvite(candidato, 'cliente')),
      ...internos.map((candidato) => mapearCandidatoConvite(candidato, 'interno')),
    ];
  }
}
