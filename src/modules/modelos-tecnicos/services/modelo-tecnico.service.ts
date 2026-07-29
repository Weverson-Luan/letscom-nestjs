import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { resolvePagination } from 'src/shared/database/pagination';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { buildPagination } from 'src/shared/utils/api-response';
import { CreateModeloTecnicoDto } from '../dto/create-modelo-tecnico.dto';
import { UpdateModeloTecnicoDto } from '../dto/update-modelo-tecnico.dto';
import { ModeloTecnicoMapper } from '../mappers/modelo-tecnico.mapper';
import { ModeloTecnicoRepository } from '../repositories/modelo-tecnico.repository';

type UploadFile = { buffer: Buffer; originalname: string; mimetype?: string };

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png']);
const MAX_BYTES = 5120 * 1024;

/** Espelha ModeloTecnicosService. */
@Injectable()
export class ModeloTecnicoService {
  constructor(
    private readonly repository: ModeloTecnicoRepository,
    private readonly mapper: ModeloTecnicoMapper,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  async listar(query: Record<string, unknown>, clienteId?: bigint) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const defaultSort = clienteId ? 'nome_modelo' : 'created_at';
    const defaultOrder = clienteId ? 'asc' : 'desc';
    const order =
      String(query.order ?? defaultOrder).toLowerCase() === 'asc'
        ? 'asc'
        : 'desc';

    const { data, total } = await this.repository.paginate({
      clienteId,
      search: query.search as string | undefined,
      sortBy: (query.sort_by as string) ?? defaultSort,
      order,
      skip,
      take,
    });

    return {
      data: await this.mapper.mapMany(data),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async buscarUnico(id: bigint) {
    const modelo = await this.repository.findById(id);
    if (!modelo) {
      throw new NotFoundException('Modelo técnico não encontrado.');
    }
    return this.mapper.mapOne(modelo);
  }

  async buscar(id: bigint) {
    const modelo = await this.repository.findById(id);
    if (!modelo) {
      throw new NotFoundException('Modelo técnico não encontrado.');
    }
    return modelo;
  }

  async criar(
    dto: CreateModeloTecnicoDto,
    fotoFrente?: UploadFile,
    fotoVerso?: UploadFile,
  ) {
    this.validarFotoObrigatoria(fotoFrente, 'foto_frente');
    this.validarFotoObrigatoria(fotoVerso, 'foto_verso');
    await this.validarFks(dto.cliente_id, dto.produto_id, dto.tecnologia_id);

    const uploaded: string[] = [];
    try {
      const frentePath = await this.armazenarFoto(fotoFrente!, 'frente');
      uploaded.push(frentePath);
      const versoPath = await this.armazenarFoto(fotoVerso!, 'verso');
      uploaded.push(versoPath);

      return await this.repository.create({
        cliente: { connect: { id: BigInt(dto.cliente_id) } },
        produto: { connect: { id: BigInt(dto.produto_id) } },
        tecnologia: { connect: { id: BigInt(dto.tecnologia_id) } },
        nomeModelo: dto.nome_modelo,
        campoChave: dto.campo_chave,
        posicionamento: dto.posicionamento,
        temFuro: dto.tem_furo ?? false,
        tipoFuro: dto.tipo_furo ?? null,
        temCargaFoto: dto.tem_carga_foto ?? false,
        temDadosVariaveis: dto.tem_dados_variaveis ?? false,
        isProvisorio: dto.is_provisorio ?? null,
        observacoes: dto.observacoes ?? null,
        fotoFrentePath: frentePath,
        fotoVersoPath: versoPath,
        ativo: true,
      });
    } catch (err) {
      await this.cleanupFiles(uploaded);
      throw err;
    }
  }

  async atualizar(
    id: bigint,
    dto: UpdateModeloTecnicoDto,
    fotoFrente?: UploadFile,
    fotoVerso?: UploadFile,
  ) {
    const atual = await this.buscar(id);
    if (fotoFrente) this.validarFoto(fotoFrente, 'foto_frente');
    if (fotoVerso) this.validarFoto(fotoVerso, 'foto_verso');

    if (dto.cliente_id || dto.produto_id || dto.tecnologia_id) {
      await this.validarFks(
        dto.cliente_id ?? Number(atual.clienteId),
        dto.produto_id ?? Number(atual.produtoId),
        dto.tecnologia_id ?? Number(atual.tecnologiaId),
      );
    }

    const uploaded: string[] = [];
    const oldToDelete: string[] = [];

    try {
      const data: Prisma.ModeloTecnicoUpdateInput = {};

      if (dto.cliente_id !== undefined) {
        data.cliente = { connect: { id: BigInt(dto.cliente_id) } };
      }
      if (dto.produto_id !== undefined) {
        data.produto = { connect: { id: BigInt(dto.produto_id) } };
      }
      if (dto.tecnologia_id !== undefined) {
        data.tecnologia = { connect: { id: BigInt(dto.tecnologia_id) } };
      }
      if (dto.nome_modelo !== undefined) data.nomeModelo = dto.nome_modelo;
      if (dto.campo_chave !== undefined) data.campoChave = dto.campo_chave;
      if (dto.posicionamento !== undefined) {
        data.posicionamento = dto.posicionamento;
      }
      if (dto.tem_furo !== undefined) data.temFuro = dto.tem_furo;
      if (dto.tipo_furo !== undefined) data.tipoFuro = dto.tipo_furo;
      if (dto.tem_carga_foto !== undefined) data.temCargaFoto = dto.tem_carga_foto;
      if (dto.tem_dados_variaveis !== undefined) {
        data.temDadosVariaveis = dto.tem_dados_variaveis;
      }
      if (dto.is_provisorio !== undefined) data.isProvisorio = dto.is_provisorio;
      if (dto.observacoes !== undefined) data.observacoes = dto.observacoes;

      if (fotoFrente) {
        const path = await this.armazenarFoto(fotoFrente, 'frente');
        uploaded.push(path);
        data.fotoFrentePath = path;
        if (atual.fotoFrentePath) oldToDelete.push(atual.fotoFrentePath);
      }
      if (fotoVerso) {
        const path = await this.armazenarFoto(fotoVerso, 'verso');
        uploaded.push(path);
        data.fotoVersoPath = path;
        if (atual.fotoVersoPath) oldToDelete.push(atual.fotoVersoPath);
      }

      const updated = await this.repository.update(id, data);
      await this.cleanupFiles(oldToDelete);
      return updated;
    } catch (err) {
      await this.cleanupFiles(uploaded);
      throw err;
    }
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    // Espelha Laravel: hard delete sem limpar storage.
    await this.repository.delete(id);
  }

  private async armazenarFoto(file: UploadFile, pasta: 'frente' | 'verso') {
    const ext = (extname(file.originalname) || '.jpg').replace('.', '');
    const path = `modelos/${pasta}/${randomUUID()}.${ext}`;
    await this.storage.put(path, file.buffer);
    return path;
  }

  private validarFotoObrigatoria(file: UploadFile | undefined, field: string) {
    if (!file) {
      throw new BadRequestException({
        status: 422,
        message: 'Erro de validação',
        errors: { [field]: [`O campo ${field} é obrigatório.`] },
      });
    }
    this.validarFoto(file, field);
  }

  private validarFoto(file: UploadFile, field: string) {
    const mime = (file.mimetype ?? '').toLowerCase();
    if (mime && !ALLOWED_MIMES.has(mime)) {
      throw new BadRequestException({
        status: 422,
        message: 'Erro de validação',
        errors: {
          [field]: ['A imagem deve ser jpg, jpeg ou png (máx. 5MB).'],
        },
      });
    }
    if (file.buffer.length > MAX_BYTES) {
      throw new BadRequestException({
        status: 422,
        message: 'Erro de validação',
        errors: {
          [field]: ['A imagem deve ter no máximo 5MB.'],
        },
      });
    }
  }

  private async validarFks(
    clienteId: number,
    produtoId: number,
    tecnologiaId: number,
  ) {
    const [cliente, produto, tecnologia] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: BigInt(clienteId), deletedAt: null },
      }),
      this.prisma.product.findFirst({
        where: { id: BigInt(produtoId), deletedAt: null },
      }),
      this.prisma.tecnologia.findUnique({ where: { id: BigInt(tecnologiaId) } }),
    ]);
    const errors: Record<string, string[]> = {};
    if (!cliente) errors.cliente_id = ['Cliente não encontrado.'];
    if (!produto) errors.produto_id = ['Produto não encontrado.'];
    if (!tecnologia) errors.tecnologia_id = ['Tecnologia não encontrada.'];
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({
        status: 422,
        message: 'Erro de validação',
        errors,
      });
    }
  }

  private async cleanupFiles(paths: string[]) {
    for (const path of paths) {
      try {
        await this.storage.delete(path);
      } catch {
        // best-effort
      }
    }
  }
}
