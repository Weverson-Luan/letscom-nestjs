/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';
import { HashService } from 'src/shared/utils/hash.service';

// dto / repository / mappers
import { CriarUsuarioInternoDto } from '../dto/criar-usuario-interno.dto';
import { CriarUsuarioInternoRepository } from '../repositories/criar-usuario-interno.repository';
import { mapearUsuarioInterno } from '../mappers/usuario-interno.mapper';

// helpers
import { traduzirErroDuplicidade } from './helpers/traduzir-erro-duplicidade.helper';

/** Cria o usuário e vincula o papel interno na mesma transação. */
@Injectable()
export class CriarUsuarioInternoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CriarUsuarioInternoRepository,
    private readonly roleUserRepository: RoleUserRepository,
    private readonly hash: HashService,
  ) {}

  async execute(dados: CriarUsuarioInternoDto) {
    const senhaHash = await this.hash.make(dados.senha);

    try {
      const usuario = await this.prisma.$transaction(async (transacao) => {
        const papel = await this.repository.buscarIdPapel(dados.papel, transacao);
        if (!papel) {
          throw new BusinessException(`Papel ${dados.papel} não cadastrado.`);
        }

        const criado = await this.repository.criar(
          {
            nome: dados.nome,
            email: dados.email,
            senha: senhaHash,
            telefone: dados.telefone,
            tipoPessoa: dados.tipo_pessoa,
            documento: dados.documento || null,
            ativo: dados.ativo ?? true,
          },
          transacao,
        );
        await this.roleUserRepository.attachToUser(transacao, criado.id, papel.id, true);
        return criado;
      });

      return mapearUsuarioInterno(usuario, dados.papel);
    } catch (erro) {
      throw traduzirErroDuplicidade(erro);
    }
  }
}
