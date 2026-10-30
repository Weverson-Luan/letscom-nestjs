/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { HashService } from 'src/shared/utils/hash.service';

// dto / repository / mappers
import { AtualizarUsuarioInternoDto } from '../dto/atualizar-usuario-interno.dto';
import { AtualizarUsuarioInternoRepository } from '../repositories/atualizar-usuario-interno.repository';
import { UsuarioInternoComPapelRepository } from '../repositories/usuario-interno-com-papel.repository';
import { mapearUsuarioInterno } from '../mappers/usuario-interno.mapper';

// exceptions / helpers
import { UsuarioInternoNaoEncontradoException } from '../exceptions/usuario-interno-nao-encontrado.exception';
import { traduzirErroDuplicidade } from './helpers/traduzir-erro-duplicidade.helper';

/** Edita dados do usuário interno. E-mail e papel nunca são alterados aqui. */
@Injectable()
export class AtualizarUsuarioInternoService {
  constructor(
    private readonly repository: AtualizarUsuarioInternoRepository,
    private readonly usuarioInternoComPapelRepository: UsuarioInternoComPapelRepository,
    private readonly hash: HashService,
  ) {}

  async execute(id: bigint, dados: AtualizarUsuarioInternoDto) {
    const encontrado = await this.usuarioInternoComPapelRepository.buscarPorId(id);
    if (!encontrado) throw new UsuarioInternoNaoEncontradoException();

    const alteracoes: Prisma.UserUpdateInput = {};
    if (dados.nome !== undefined) alteracoes.nome = dados.nome;
    if (dados.telefone !== undefined) alteracoes.telefone = dados.telefone;
    if (dados.documento !== undefined) alteracoes.documento = dados.documento || null;
    if (dados.tipo_pessoa !== undefined) alteracoes.tipoPessoa = dados.tipo_pessoa;
    if (dados.ativo !== undefined) alteracoes.ativo = dados.ativo;
    if (dados.senha) alteracoes.senha = await this.hash.make(dados.senha);

    try {
      const usuario = await this.repository.atualizar(id, alteracoes);
      return mapearUsuarioInterno(usuario, encontrado.papel);
    } catch (erro) {
      throw traduzirErroDuplicidade(erro);
    }
  }
}
