import { Injectable } from '@nestjs/common';
import {
  ModeloTecnico,
  ModeloTecnicoCampoVariavel,
  Product,
  Tecnologia,
  User,
} from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';

type ModeloWithRels = ModeloTecnico & {
  cliente?: User | null;
  produto?: Product | null;
  tecnologia?: Tecnologia | null;
  camposVariaveis?: ModeloTecnicoCampoVariavel[];
};

/** Espelha ModeloTecnicosResponseHelper::mapModeloUnico. */
@Injectable()
export class ModeloTecnicoMapper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async mapMany(modelos: ModeloWithRels[]) {
    return Promise.all(modelos.map((m) => this.mapOne(m)));
  }

  async mapOne(modelo: ModeloWithRels) {
    const campos = [...(modelo.camposVariaveis ?? [])].sort(
      (a, b) => a.ordem - b.ordem,
    );
    const planilhaCampos = campos.map((c) => c.nome);

    const [remessasEmAndamento, totalProduzidas] = await Promise.all([
      this.contarEmAndamento(modelo.id),
      this.contarProduzidas(modelo.id),
    ]);

    return {
      id: modelo.id,
      cliente_id: modelo.clienteId,
      produto_id: modelo.produtoId,
      tecnologia_id: modelo.tecnologiaId,
      nome_modelo: modelo.nomeModelo,
      posicionamento: modelo.posicionamento,
      tem_furo: modelo.temFuro,
      tem_carga_foto: modelo.temCargaFoto,
      tem_dados_variaveis: modelo.temDadosVariaveis,
      is_provisorio: modelo.isProvisorio,
      ativo: modelo.ativo,
      tipo_furo: modelo.tipoFuro,
      campo_chave: modelo.campoChave,
      foto_frente_path: modelo.fotoFrentePath,
      foto_verso_path: modelo.fotoVersoPath,
      observacoes: modelo.observacoes,
      created_at: modelo.createdAt,
      updated_at: modelo.updatedAt,
      cliente: modelo.cliente
        ? {
            id: modelo.cliente.id,
            nome: modelo.cliente.nome,
            email: modelo.cliente.email,
          }
        : null,
      produto: modelo.produto
        ? {
            id: modelo.produto.id,
            nome: modelo.produto.nome,
          }
        : null,
      tecnologia: modelo.tecnologia
        ? {
            id: modelo.tecnologia.id,
            nome: modelo.tecnologia.nome,
          }
        : null,
      campos_variaveis: campos.map(mapCampoVariavel),
      campos_variavei_planilhas: planilhaCampos,
      remessas_em_andamento: remessasEmAndamento,
      total_remessas_produzidas: totalProduzidas,
      foto_frente_url: modelo.fotoFrentePath
        ? await this.storage.getSignedUrl(modelo.fotoFrentePath)
        : null,
      foto_verso_url: modelo.fotoVersoPath
        ? await this.storage.getSignedUrl(modelo.fotoVersoPath)
        : null,
    };
  }

  private async contarEmAndamento(modeloId: bigint): Promise<number> {
    const agg = await this.prisma.remessa.aggregate({
      where: {
        modeloTecnicoId: modeloId,
        deletedAt: null,
        status: { notIn: ['concluida', 'concluído', 'cancelada'] },
      },
      _sum: { totalSolicitacoes: true },
    });
    return Number(agg._sum.totalSolicitacoes ?? 0);
  }

  private async contarProduzidas(modeloId: bigint): Promise<number> {
    return this.prisma.remessa.count({
      where: {
        modeloTecnicoId: modeloId,
        deletedAt: null,
        status: 'concluido',
      },
    });
  }
}

export function mapCampoVariavel(campo: ModeloTecnicoCampoVariavel) {
  return {
    id: campo.id,
    modelo_tecnico_id: campo.modeloTecnicoId,
    nome: campo.nome,
    obrigatorio: campo.obrigatorio,
    ordem: campo.ordem,
    created_at: campo.createdAt,
    updated_at: campo.updatedAt,
  };
}
