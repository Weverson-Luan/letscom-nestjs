/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// dto / repository / mappers
import { AtualizarUsuarioAtendimentoDto } from '../dto/atualizar-usuario-atendimento.dto';
import { AtualizarUsuarioAtendimentoRepository } from '../repositories/atualizar-usuario-atendimento.repository';
import { mapearUsuarioAtendimento } from '../mappers/usuario-atendimento.mapper';

// exceptions
import { UsuarioAtendimentoNaoEncontradoException } from '../exceptions/usuario-atendimento-nao-encontrado.exception';

/** Atualiza só os campos enviados de um usuário de atendimento. */
@Injectable()
export class AtualizarUsuarioAtendimentoService {
  constructor(private readonly repository: AtualizarUsuarioAtendimentoRepository) {}

  async execute(id: bigint, dados: AtualizarUsuarioAtendimentoDto) {
    const existente = await this.repository.buscarPorId(id);
    if (!existente) throw new UsuarioAtendimentoNaoEncontradoException();

    const dadosAtualizacao: Prisma.UserAtendimentoUpdateInput = {};
    if (dados.nome !== undefined) dadosAtualizacao.nome = dados.nome;
    if (dados.email !== undefined) dadosAtualizacao.email = dados.email;
    if (dados.telefone !== undefined) dadosAtualizacao.telefone = dados.telefone;
    if (dados.documento !== undefined) dadosAtualizacao.documento = dados.documento;
    if (dados.ativo !== undefined) dadosAtualizacao.ativo = dados.ativo;

    const usuarioAtendimento = await this.repository.atualizar(id, dadosAtualizacao);
    return mapearUsuarioAtendimento(usuarioAtendimento);
  }
}
