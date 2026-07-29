import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreateFullClientService } from '../services/create-full-client.service';

/** Espelha UserController::criarClienteCompleto (validação + criação transacional). */
@Injectable()
export class CreateFullClientUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly service: CreateFullClientService,
  ) {}

  async execute(body: Record<string, any>): Promise<{ status: number; body: any }> {
    const errors = await this.validate(body);
    if (Object.keys(errors).length > 0) {
      return { status: 422, body: { status: 422, message: 'Erro de validação', errors } };
    }

    try {
      const result = await this.service.executar({
        cliente: body.cliente,
        endereco: body.endereco,
        usuarios_cliente: body.usuarios_cliente,
      });

      return {
        status: 201,
        body: {
          status: 201,
          message: 'Cliente, endereço e usuários criados com sucesso!',
          data: {
            user: result.user,
            endereco: result.endereco,
            usuarios_cliente: result.usuarios_cliente,
          },
        },
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        return {
          status: 422,
          body: {
            status: 422,
            message: 'Erro de regra de negócio',
            errors: { message: error.message },
          },
        };
      }
      return { status: 500, body: { status: 500, message: 'Erro interno no servidor' } };
    }
  }

  private async validate(body: Record<string, any>): Promise<Record<string, string[]>> {
    const errors: Record<string, string[]> = {};
    const cliente = body.cliente ?? {};
    const endereco = body.endereco ?? {};

    if (!body.cliente) errors.cliente = ['O objeto cliente é obrigatório.'];
    if (!body.endereco) errors.endereco = ['O objeto endereço é obrigatório.'];

    if (!cliente.nome) errors['cliente.nome'] = ['O nome é obrigatório.'];
    if (!cliente.email) {
      errors['cliente.email'] = ['O e-mail é obrigatório.'];
    } else if (await this.prisma.user.findUnique({ where: { email: cliente.email } })) {
      errors['cliente.email'] = ['Este e-mail já está em uso por outro usuário!'];
    }
    if (!cliente.documento) {
      errors['cliente.documento'] = ['O documento é obrigatório.'];
    } else if (await this.prisma.user.findUnique({ where: { documento: cliente.documento } })) {
      errors['cliente.documento'] = ['Este documento já está em uso por outro usuário!'];
    }
    if (!cliente.telefone) {
      errors['cliente.telefone'] = ['O telefone é obrigatório.'];
    } else if (await this.prisma.user.findUnique({ where: { telefone: cliente.telefone } })) {
      errors['cliente.telefone'] = ['Este telefone já está em uso por outro usuário!'];
    }
    if (!['F', 'J'].includes(cliente.tipo_pessoa)) {
      errors['cliente.tipo_pessoa'] = ['O tipo de pessoa deve ser F ou J.'];
    }
    if (!cliente.senha || String(cliente.senha).length < 6) {
      errors['cliente.senha'] = ['A senha deve ter pelo menos 6 caracteres.'];
    }

    for (const campo of ['logradouro', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'tipo_endereco', 'nome_responsavel', 'email', 'setor', 'telefone']) {
      if (!endereco[campo]) errors[`endereco.${campo}`] = [`O campo ${campo} é obrigatório.`];
    }

    return errors;
  }
}
