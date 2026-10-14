import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';
import { HashService } from 'src/shared/utils/hash.service';
import { CriarUsuarioInternoDto } from '../dto/criar-usuario-interno.dto';
import { mapearUsuarioInterno } from '../mappers/usuario-interno.mapper';
import { UsuarioInternoRepository } from '../repositories/usuario-interno.repository';
import { traduzirErroDuplicidade } from './helpers/traduzir-erro-duplicidade.helper';

@Injectable()
export class CriarUsuarioInternoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UsuarioInternoRepository,
    private readonly roleUserRepo: RoleUserRepository,
    private readonly hash: HashService,
  ) {}

  async execute(dados: CriarUsuarioInternoDto) {
    const senhaHash = await this.hash.make(dados.senha);

    try {
      const usuario = await this.prisma.$transaction(async (tx) => {
        const papel = await this.repository.buscarIdPapel(dados.papel, tx);
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
          tx,
        );
        await this.roleUserRepo.attachToUser(tx, criado.id, papel.id, true);
        return criado;
      });

      return mapearUsuarioInterno(usuario, dados.papel);
    } catch (erro) {
      throw traduzirErroDuplicidade(erro);
    }
  }
}
