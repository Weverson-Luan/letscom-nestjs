/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { HashService } from 'src/shared/utils/hash.service';

// repository
import { CriarUsuarioRepository } from '../repositories/criar-usuario.repository';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

/** Cria usuário + sincroniza role/consultor/tipo_entrega (transação). */
@Injectable()
export class CriarUsuarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CriarUsuarioRepository,
    private readonly hash: HashService,
    private readonly roleUserRepo: RoleUserRepository,
  ) {}

  async execute(data: Record<string, any>) {
    const roleId = data.roles ?? null;
    const consultorId = data.consultor_id ?? null;
    const tipoEntregaId = data.tipo_entrega_id ?? null;

    const senha = data.senha ? await this.hash.make(data.senha) : undefined;

    return this.prisma.$transaction(async (transacao) => {
      const user = await this.repository.criar(
        {
          nome: data.nome,
          email: data.email,
          senha: senha!,
          documento: data.documento ?? null,
          telefone: data.telefone,
          tipoPessoa: data.tipo_pessoa,
          ativo: data.ativo ?? true,
        },
        transacao,
      );

      if (roleId) {
        await this.roleUserRepo.attachToUser(transacao, user.id, BigInt(roleId), true);
      }
      if (consultorId) {
        await this.repository.vincularConsultor(user.id, BigInt(consultorId), transacao);
      }
      if (tipoEntregaId) {
        await this.repository.vincularTipoEntrega(user.id, BigInt(tipoEntregaId), transacao);
      }

      return user;
    });
  }
}
