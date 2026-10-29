/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// dto / repository / mappers
import { CriarUsuarioAtendimentoDto } from '../dto/criar-usuario-atendimento.dto';
import { CriarUsuarioAtendimentoRepository } from '../repositories/criar-usuario-atendimento.repository';
import { mapearUsuarioAtendimento } from '../mappers/usuario-atendimento.mapper';

// exceptions
import { UsuarioDonoNaoEncontradoException } from '../exceptions/usuario-dono-nao-encontrado.exception';

/** Cria um usuário de atendimento vinculado a um usuário não excluído. */
@Injectable()
export class CriarUsuarioAtendimentoService {
  constructor(private readonly repository: CriarUsuarioAtendimentoRepository) {}

  async execute(dados: CriarUsuarioAtendimentoDto) {
    const usuario = await this.repository.buscarUsuarioNaoExcluido(BigInt(dados.user_id));
    if (!usuario) throw new UsuarioDonoNaoEncontradoException();

    const usuarioAtendimento = await this.repository.criar({
      user: { connect: { id: usuario.id } },
      nome: dados.nome ?? null,
      email: dados.email,
      telefone: dados.telefone,
      documento: dados.documento ?? null,
      ativo: dados.ativo ?? true,
    });
    return mapearUsuarioAtendimento(usuarioAtendimento);
  }
}
