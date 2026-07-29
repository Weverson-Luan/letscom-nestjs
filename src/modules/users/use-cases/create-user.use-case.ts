import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { serializeUser } from 'src/modules/auth/mappers/auth-response.mapper';
import { UserService } from '../services/user.service';

/**
 * Espelha UserController::criarUsuario incluindo a validação manual (com
 * unique/exists no banco) e o formato de resposta (201 sucesso, 422 validação).
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async execute(body: Record<string, any>): Promise<{ status: number; body: any }> {
    const errors = await this.validate(body);
    if (Object.keys(errors).length > 0) {
      return {
        status: 422,
        body: {
          code: 422,
          message: 'Erro de validação dos dados informados!',
          errors,
        },
      };
    }

    try {
      const user = await this.userService.create(body);
      return {
        status: 201,
        body: { message: 'Usuário criado com sucesso!', data: serializeUser(user) },
      };
    } catch (error) {
      return {
        status: 500,
        body: { message: 'Erro ao criar o usuário.', error: (error as Error).message },
      };
    }
  }

  private async validate(body: Record<string, any>): Promise<Record<string, string[]>> {
    const errors: Record<string, string[]> = {};

    if (!body.nome || typeof body.nome !== 'string') {
      errors.nome = ['O nome é obrigatório.'];
    }
    if (!body.email) {
      errors.email = ['O e-mail é obrigatório.'];
    } else if (await this.prisma.user.findUnique({ where: { email: body.email } })) {
      errors.email = ['Este e-mail já está em uso por outro usuário!'];
    }
    if (!body.documento) {
      errors.documento = ['O documento é obrigatório.'];
    } else if (await this.prisma.user.findUnique({ where: { documento: body.documento } })) {
      errors.documento = ['Este documento já está em uso por outro usuário!'];
    }
    if (!body.telefone) {
      errors.telefone = ['O telefone é obrigatório.'];
    } else if (await this.prisma.user.findUnique({ where: { telefone: body.telefone } })) {
      errors.telefone = ['Este telefone já está em uso por outro usuário!'];
    }
    if (!['F', 'J'].includes(body.tipo_pessoa)) {
      errors.tipo_pessoa = ['O tipo de pessoa deve ser F ou J.'];
    }
    if (!body.senha || String(body.senha).length < 6) {
      errors.senha = ['A senha deve ter pelo menos 6 caracteres.'];
    }
    if (body.roles && !(await this.prisma.role.findUnique({ where: { id: BigInt(body.roles) } }))) {
      errors.roles = ['O id da role não foi encontrado!'];
    }
    if (
      body.consultor_id &&
      !(await this.prisma.user.findUnique({ where: { id: BigInt(body.consultor_id) } }))
    ) {
      errors.consultor_id = ['O id do consultor não foi encontrado!'];
    }
    if (
      body.tipo_entrega_id &&
      !(await this.prisma.tipoEntrega.findUnique({
        where: { id: BigInt(body.tipo_entrega_id) },
      }))
    ) {
      errors.tipo_entrega_id = ['O id do tipo de entrega não foi encontrado!'];
    }

    return errors;
  }
}
