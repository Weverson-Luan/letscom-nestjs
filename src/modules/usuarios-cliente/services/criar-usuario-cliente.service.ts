/**
 * IMPORTS
 */
import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { HashService } from 'src/shared/utils/hash.service';

// repository
import { CriarUsuarioClienteRepository } from '../repositories/criar-usuario-cliente.repository';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

/** Cria o usuário subordinado + atribui role (transação). */
@Injectable()
export class CriarUsuarioClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CriarUsuarioClienteRepository,
    private readonly hash: HashService,
    private readonly roleUserRepository: RoleUserRepository,
  ) {}

  async execute(dados: Record<string, any>) {
    if (!dados.cliente_id) {
      throw new BusinessException('O cliente_id é obrigatório.', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (!dados.email) {
      throw new BusinessException('O e-mail é obrigatório.', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (!dados.senha) {
      throw new BusinessException('A senha é obrigatória.', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const senha = await this.hash.make(String(dados.senha));

    return this.prisma.$transaction(async (transacao) => {
      if (await this.repository.buscarPorEmail(dados.email, transacao)) {
        throw new BusinessException(
          'E-mail já cadastrado no sistema.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      if (
        dados.documento &&
        (await this.repository.buscarPorDocumento(dados.documento, transacao))
      ) {
        throw new BusinessException(
          'Documento (CPF/CNPJ) já cadastrado no sistema.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const usuario = await this.repository.criar(
        {
          clientePrincipal: { connect: { id: BigInt(dados.cliente_id) } },
          email: dados.email,
          nome: dados.nome ?? null,
          senha,
          documento: dados.documento ?? null,
          ativo: dados.ativo ?? true,
        },
        transacao,
      );

      const roleId = dados.role_id
        ? BigInt(dados.role_id)
        : await this.buscarIdPapelSubordinado(transacao);
      await this.roleUserRepository.attachToUserCliente(transacao, usuario.id, roleId, true);

      return usuario;
    });
  }

  private async buscarIdPapelSubordinado(transacao: Prisma.TransactionClient) {
    const papelPadrao = await this.repository.buscarPapelSubordinado(transacao);
    if (!papelPadrao) {
      throw new Error('Role padrão "Subordinado" não encontrada.');
    }
    return papelPadrao.id;
  }
}
