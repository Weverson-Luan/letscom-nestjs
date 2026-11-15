/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { Role } from 'src/shared/constants/roles';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { serializeUser } from 'src/modules/auth/mappers/auth-response.mapper';

// utils
import { HashService } from 'src/shared/utils/hash.service';
import { formatarCep } from 'src/shared/utils/format-zip-code';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';
import { montarMensagemCadastroDuplicado } from './helpers/montar-mensagem-cadastro-duplicado.helper';
import { CadastroDuplicadoException } from '../exceptions/cadastro-duplicado.exception';

// typings
import {
  FullClientClienteDto,
  FullClientEnderecoDto,
  FullClientUsuarioClienteDto,
} from '../dto/create-full-client.dto';

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

    return this.prisma
      .$transaction(async (transacao) => {
        // 1) cliente principal
        const user = await transacao.user.create({
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

        // sem role não há feature flag: na falta do id, usa o papel padrão
        const papelCliente = clientePayload.roles
          ? BigInt(clientePayload.roles)
          : await this.buscarIdPapel(transacao, Role.CLIENTE);
        await this.roleUserRepo.attachToUser(transacao, user.id, papelCliente, true);

        let papelSubordinadoPadrao: bigint | undefined;

        const buscarPapelSubordinado = async () =>
          (papelSubordinadoPadrao ??= await this.buscarIdPapel(transacao, Role.SUBORDINADO));

        if (clientePayload.consultor_id) {
          await transacao.clienteConsultor.create({
            data: { clienteId: user.id, consultorId: BigInt(clientePayload.consultor_id) },
          });
        }

        if (clientePayload.tipo_entrega_id) {
          await transacao.tipoEntregaUser.create({
            data: { clienteId: user.id, tipoEntregaId: BigInt(clientePayload.tipo_entrega_id) },
          });
        }

        // 2) endereço
        const end = data.endereco;
        const endereco = await transacao.endereco.create({
          data: {
            userId: user.id,
            logradouro: end.logradouro ?? null,
            numero: end.numero,
            complemento: end.complemento ?? null,
            bairro: end.bairro,
            cidade: end.cidade,
            estado: end.estado,
            cep: formatarCep(String(end.cep ?? '')),
            tipoEndereco: end.tipo_endereco,
            nomeResponsavel: end.nome_responsavel,
            email: end.email,
            setor: end.setor,
            telefone: end.telefone,
          },
        });

        // 3) subordinados informados
        const usuariosCliente: any[] = [];
        for (const sub of data.usuarios_cliente ?? []) {
          const created = await transacao.userCliente.create({
            data: {
              clienteId: user.id,
              nome: sub.nome,
              email: sub.email,
              senha: await this.hashPassword.make(sub.senha),
              documento: sub.documento ?? null,
              ativo: sub.ativo !== undefined ? Boolean(sub.ativo) : true,
            },
          });
          await this.roleUserRepo.attachToUserCliente(
            transacao,
            created.id,
            sub.role_id ? BigInt(sub.role_id) : await buscarPapelSubordinado(),
            true,
          );
          usuariosCliente.push(created);
        }

        // 4) subordinado padrão "Letscom Comercial"
        const senhaDefault =
          this.config.get<string>('business.senhaUsuarioSubordinadoDefault') ?? 'letscom';
        const padrao = await transacao.userCliente.create({
          data: {
            clienteId: user.id,
            nome: 'Letscom Comercial',
            email: `comercial${user.id}@letscom.com.br`,
            senha: await this.hashPassword.make(senhaDefault),
            documento: null,
            ativo: true,
          },
        });
        await this.roleUserRepo.attachToUserCliente(
          transacao,
          padrao.id,
          await buscarPapelSubordinado(),
          true,
        );
        usuariosCliente.push(padrao);

        return {
          user: serializeUser(user),
          endereco,
          usuarios_cliente: usuariosCliente.map((u) => serializeUser(u)),
        };
      })
      .catch((erro: unknown) => {
        // índice único violado (e-mail/documento/telefone já usados): 409 em vez de 500 com o erro cru do Prisma
        if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
          throw new CadastroDuplicadoException(montarMensagemCadastroDuplicado(erro.meta?.target));
        }
        throw erro;
      });
  }

  /** Id do papel pelo nome (roles.nome pode estar como `cliente` ou `Cliente`). */
  private async buscarIdPapel(transacao: Prisma.TransactionClient, papel: Role): Promise<bigint> {
    const nomeCapitalizado = papel.charAt(0).toUpperCase() + papel.slice(1);
    const encontrado = await transacao.role.findFirst({
      where: { nome: { in: [papel, nomeCapitalizado] } },
      select: { id: true },
    });
    if (!encontrado) {
      throw new Error(`Role padrão "${nomeCapitalizado}" não encontrada.`);
    }
    return encontrado.id;
  }
}
