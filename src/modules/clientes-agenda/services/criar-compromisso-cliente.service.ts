import { Injectable } from '@nestjs/common';
import { ClienteCompromissoTipo } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { CriarCompromissoClienteDto } from '../dto/criar-compromisso-cliente.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ResponsavelCompromissoDuplicadoException } from '../exceptions/responsavel-compromisso-duplicado.exception';
import { mapearCompromissoInterno } from '../mappers/compromisso-cliente.mapper';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import {
  ResponsavelEscolhido,
  ValidacaoResponsavelCompromissoService,
} from './validacao-responsavel-compromisso.service';

/** Registra um compromisso na agenda do cliente; o autor é o usuário logado. */
@Injectable()
export class CriarCompromissoClienteService {
  constructor(
    private readonly repository: ClienteCompromissoRepository,
    private readonly validacaoResponsavel: ValidacaoResponsavelCompromissoService,
  ) {}

  async execute(clienteId: bigint, dto: CriarCompromissoClienteDto, usuario: AuthUser) {
    if (!(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    if (dto.responsavel_id && dto.responsavel_subordinado_id) {
      throw new ResponsavelCompromissoDuplicadoException();
    }
    const responsavel: ResponsavelEscolhido = {
      responsavelId: dto.responsavel_id ? BigInt(dto.responsavel_id) : null,
      responsavelSubordinadoId: dto.responsavel_subordinado_id
        ? BigInt(dto.responsavel_subordinado_id)
        : null,
    };
    await this.validacaoResponsavel.validar(clienteId, responsavel);

    const compromisso = await this.repository.criar({
      clienteId,
      autorId: usuario.id,
      ...responsavel,
      tipo: dto.tipo ?? ClienteCompromissoTipo.nota,
      titulo: dto.titulo,
      descricao: dto.descricao?.trim() || null,
      agendadoPara: new Date(dto.agendado_para),
      visivelCliente: dto.visivel_cliente ?? false,
    });

    return mapearCompromissoInterno(compromisso);
  }
}
