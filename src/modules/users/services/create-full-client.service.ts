/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';


import { PrismaService } from 'src/shared/prisma/prisma.service';
import { serializeUser } from 'src/modules/auth/mappers/auth-response.mapper';

// utils
import { HashService } from 'src/shared/utils/hash.service';
import { formatarCep } from 'src/shared/utils/format-zip-code';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

// typings
import { FullClientClienteDto, FullClientEnderecoDto, FullClientUsuarioClienteDto } from '../dto/create-full-client.dto';

/**
 * Faz a criação de um cliente completo, incluindo:
 * - cria o cliente principal,
 * - cria o endereço,
 * - cria os usuários subordinados (incluindo o subordinado padrão "Letscom Comercial"),
 * - em uma única transação.
 */
@Injectable()
export class CreateFullClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashPassword: HashService,
    private readonly config: ConfigService,
    private readonly roleUserRepo: RoleUserRepository,
  ) {}


  async executar(data: {
    cliente: FullClientClienteDto;
    endereco: FullClientEnderecoDto;
    usuarios_cliente?: FullClientUsuarioClienteDto[];
  }) {
    const clientePayload = data.cliente;
    const senhaHash = await this.hashPassword.make(clientePayload.senha);

    return this.prisma.$transaction(async (tx) => {
      // 1) cliente principal
      const user = await tx.user.create({
        data: {
          nome: clientePayload.nome,
          email: clientePayload.email,
          senha: senhaHash,
          documento: clientePayload.documento ?? null,
          telefone: clientePayload.telefone,
          tipoPessoa: clientePayload.tipo_pessoa,
          ativo: clientePayload.ativo ?? true,
        },
      });

      if (clientePayload.roles) {
        await this.roleUserRepo.attachToUser(
          tx,
          user.id,
          BigInt(clientePayload.roles),
          true,
        );
      }
      if (clientePayload.consultor_id) {
        await tx.clienteConsultor.create({
          data: { clienteId: user.id, consultorId: BigInt(clientePayload.consultor_id) },
        });
      }
      if (clientePayload.tipo_entrega_id) {
        await tx.tipoEntregaUser.create({
          data: { clienteId: user.id, tipoEntregaId: BigInt(clientePayload.tipo_entrega_id) },
        });
      }

      // 2) endereço
      const end = data.endereco;
      const endereco = await tx.endereco.create({
        data: {
          userId: user.id,
          logradouro: end.logradouro ?? null,
          numero: end.numero,
          complemento: end.complemento ?? null,
          bairro: end.bairro,
          cidade: end.cidade,
          estado: end.estado,
          cep: formatarCep(String(end.cep ?? '')),
          tipoEndereco: end.tipo_endereco as any,
          nomeResponsavel: end.nome_responsavel,
          email: end.email,
          setor: end.setor,
          telefone: end.telefone,
        },
      });

      // 3) subordinados informados
      const usuariosCliente: any[] = [];
      for (const sub of data.usuarios_cliente ?? []) {
        const created = await tx.userCliente.create({
          data: {
            clienteId: user.id,
            nome: sub.nome,
            email: sub.email,
            senha: await this.hashPassword.make(sub.senha),
            documento: sub.documento ?? null,
            ativo: sub.ativo !== undefined ? Boolean(sub.ativo) : true,
          },
        });
        if (sub.role_id) {
          await this.roleUserRepo.attachToUserCliente(
            tx,
            created.id,
            BigInt(sub.role_id),
            true,
          );
        }
        usuariosCliente.push(created);
      }

      // 4) subordinado padrão "Letscom Comercial"
      const senhaDefault =
        this.config.get<string>('business.senhaUsuarioSubordinadoDefault') ?? 'letscom';
      const padrao = await tx.userCliente.create({
        data: {
          clienteId: user.id,
          nome: 'Letscom Comercial',
          email: `comercial${user.id}@letscom.com.br`,
          senha: await this.hashPassword.make(senhaDefault),
          documento: null,
          ativo: true,
        },
      });
      usuariosCliente.push(padrao);

      return {
        user: serializeUser(user),
        endereco,
        usuarios_cliente: usuariosCliente.map((u) => serializeUser(u)),
      };
    });
  }
}
