import {
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoEndereco } from '@prisma/client';
import { resolvePagination } from 'src/shared/database/pagination';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { buildPagination } from 'src/shared/utils/api-response';
import { CreateEnderecoDto } from '../dto/create-endereco.dto';
import { UpdateEnderecoDto } from '../dto/update-endereco.dto';
import { mapEndereco } from '../mappers/endereco.mapper';
import { EnderecoRepository } from '../repositories/endereco.repository';

/** Espelha EnderecoService — CRUD de endereços vinculados a usuários. */
@Injectable()
export class EnderecoService {
  constructor(
    private readonly repository: EnderecoRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listar(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const order =
      String(query.order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const { data, total } = await this.repository.paginate({
      sortBy: (query.sort_by as string) ?? 'created_at',
      order,
      skip,
      take,
    });

    return {
      data: data.map(mapEndereco),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async buscar(id: bigint) {
    const endereco = await this.repository.findById(id);
    if (!endereco) {
      throw new NotFoundException('Endereço não encontrado.');
    }
    return endereco;
  }

  async porTipo(userId: bigint) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const [residencial, entrega] = await Promise.all([
      this.repository.findFirstByUserAndTipo(userId, TipoEndereco.residencial),
      this.repository.findFirstByUserAndTipo(userId, TipoEndereco.entrega),
    ]);

    return {
      residencial: residencial ? mapEndereco(residencial) : null,
      entrega: entrega ? mapEndereco(entrega) : null,
    };
  }

  async criar(dto: CreateEnderecoDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: BigInt(dto.user_id), deletedAt: null },
    });
    if (!user) {
      throw new BusinessException(
        'Usuário não encontrado.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const data: Prisma.EnderecoCreateInput = {
      user: { connect: { id: BigInt(dto.user_id) } },
      logradouro: dto.logradouro,
      numero: dto.numero,
      complemento: dto.complemento ?? null,
      bairro: dto.bairro,
      cidade: dto.cidade,
      estado: dto.estado,
      cep: this.formatarCep(dto.cep),
      tipoEndereco: dto.tipo_endereco,
      nomeResponsavel: dto.nome_responsavel,
      email: dto.email,
      setor: dto.setor,
      telefone: dto.telefone,
      ativo: dto.ativo ?? true,
    };

    return this.repository.create(data);
  }

  async atualizar(id: bigint, dto: UpdateEnderecoDto) {
    await this.buscar(id);

    const data: Prisma.EnderecoUpdateInput = {
      numero: dto.numero,
    };
    if (dto.logradouro !== undefined) data.logradouro = dto.logradouro;
    if (dto.complemento !== undefined) data.complemento = dto.complemento;
    if (dto.bairro !== undefined) data.bairro = dto.bairro;
    if (dto.cidade !== undefined) data.cidade = dto.cidade;
    if (dto.estado !== undefined) data.estado = dto.estado;
    if (dto.cep !== undefined) data.cep = this.formatarCep(dto.cep);
    if (dto.nome_responsavel !== undefined) {
      data.nomeResponsavel = dto.nome_responsavel;
    }
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.setor !== undefined) data.setor = dto.setor;
    if (dto.telefone !== undefined) data.telefone = dto.telefone;
    if (dto.tipo_endereco !== undefined) data.tipoEndereco = dto.tipo_endereco;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;

    return this.repository.update(id, data);
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    await this.repository.delete(id);
  }

  /** Formata CEP 8 dígitos para #####-### (como criarClienteCompleto). */
  private formatarCep(cep: string): string {
    const digits = cep.replace(/\D/g, '');
    if (digits.length === 8) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return cep;
  }
}
