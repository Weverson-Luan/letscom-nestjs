import { Injectable } from '@nestjs/common';
import { ClienteCompromissoStatus, Prisma } from '@prisma/client';
import { AtualizarCompromissoClienteDto } from '../dto/atualizar-compromisso-cliente.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { CompromissoNaoEncontradoException } from '../exceptions/compromisso-nao-encontrado.exception';
import { ResponsavelCompromissoDuplicadoException } from '../exceptions/responsavel-compromisso-duplicado.exception';
import { mapearCompromissoInterno } from '../mappers/compromisso-cliente.mapper';
import {
  ClienteCompromissoRepository,
  CompromissoComRelacoes,
} from '../repositories/cliente-compromisso.repository';
import {
  ResponsavelEscolhido,
  ValidacaoResponsavelCompromissoService,
} from './validacao-responsavel-compromisso.service';

/**
 * Edita, conclui ou cancela um compromisso. Só os campos enviados mudam; informar um responsável
 * (`responsavel_id` ou `responsavel_subordinado_id`) limpa o outro e null remove;
 * `descricao` "" ou null limpa a descrição.
 */
@Injectable()
export class AtualizarCompromissoClienteService {
  constructor(
    private readonly repository: ClienteCompromissoRepository,
    private readonly validacaoResponsavel: ValidacaoResponsavelCompromissoService,
  ) {}

  async execute(clienteId: bigint, id: bigint, dto: AtualizarCompromissoClienteDto) {
    if (!(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }
    const atual = await this.repository.buscarPorId(clienteId, id);
    if (!atual) throw new CompromissoNaoEncontradoException();

    const responsavel = this.extrairResponsavelEscolhido(dto);
    if (responsavel && !this.ehMesmoResponsavel(atual, responsavel)) {
      await this.validacaoResponsavel.validar(clienteId, responsavel);
    }

    const atualizado = await this.repository.atualizar(id, {
      ...this.montarDados(atual, dto),
      ...(responsavel ?? this.limparResponsavel(dto)),
    });
    return mapearCompromissoInterno(atualizado);
  }

  /** Novo responsável escolhido (o outro tipo é limpo); undefined quando nenhum veio preenchido. */
  private extrairResponsavelEscolhido(
    dto: AtualizarCompromissoClienteDto,
  ): ResponsavelEscolhido | undefined {
    const { responsavel_id: usuarioId, responsavel_subordinado_id: subordinadoId } = dto;
    if (usuarioId != null && subordinadoId != null) {
      throw new ResponsavelCompromissoDuplicadoException();
    }
    if (usuarioId != null) {
      return { responsavelId: BigInt(usuarioId), responsavelSubordinadoId: null };
    }
    if (subordinadoId != null) {
      return { responsavelId: null, responsavelSubordinadoId: BigInt(subordinadoId) };
    }
    return undefined;
  }

  /** Mantido o mesmo responsável, não revalida (ele pode ter sido desativado depois). */
  private ehMesmoResponsavel(atual: CompromissoComRelacoes, novo: ResponsavelEscolhido): boolean {
    return novo.responsavelSubordinadoId !== null
      ? novo.responsavelSubordinadoId === atual.responsavelSubordinadoId
      : novo.responsavelId === atual.responsavelId;
  }

  /** Só null enviado: limpa o(s) campo(s) informado(s). */
  private limparResponsavel(
    dto: AtualizarCompromissoClienteDto,
  ): Prisma.ClienteCompromissoUncheckedUpdateInput {
    return {
      ...(dto.responsavel_id === null ? { responsavelId: null } : {}),
      ...(dto.responsavel_subordinado_id === null ? { responsavelSubordinadoId: null } : {}),
    };
  }

  private montarDados(
    atual: CompromissoComRelacoes,
    dto: AtualizarCompromissoClienteDto,
  ): Prisma.ClienteCompromissoUncheckedUpdateInput {
    const dados: Prisma.ClienteCompromissoUncheckedUpdateInput = {};
    if (dto.titulo !== undefined) dados.titulo = dto.titulo;
    if (dto.tipo !== undefined) dados.tipo = dto.tipo;
    // "" ou null limpam a descrição
    if (dto.descricao !== undefined) dados.descricao = dto.descricao?.trim() || null;
    if (dto.agendado_para !== undefined) dados.agendadoPara = new Date(dto.agendado_para);
    if (dto.visivel_cliente !== undefined) dados.visivelCliente = dto.visivel_cliente;
    if (dto.status !== undefined) {
      dados.status = dto.status;
      dados.concluidoEm = this.calcularConcluidoEm(atual, dto.status);
    }
    return dados;
  }

  /** Concluir grava a data (mantém a original se já estava concluído); outro status limpa. */
  private calcularConcluidoEm(atual: CompromissoComRelacoes, novoStatus: ClienteCompromissoStatus) {
    if (novoStatus !== ClienteCompromissoStatus.concluido) return null;
    return atual.status === ClienteCompromissoStatus.concluido && atual.concluidoEm
      ? atual.concluidoEm
      : new Date();
  }
}
