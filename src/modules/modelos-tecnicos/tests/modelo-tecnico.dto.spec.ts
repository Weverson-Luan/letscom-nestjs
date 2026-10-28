import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateModeloTecnicoDto } from '../dto/create-modelo-tecnico.dto';
import { UpdateModeloTecnicoDto } from '../dto/update-modelo-tecnico.dto';

/** Mesmas opções do ValidationPipe global (main.ts). */
function validar<T extends object>(classe: new () => T, corpo: Record<string, unknown>) {
  const instancia = plainToInstance(classe, corpo, { enableImplicitConversion: true });
  const erros = validateSync(instancia, { whitelist: true });
  return { instancia, campos: erros.map((erro) => erro.property) };
}

describe('UpdateModeloTecnicoDto', () => {
  it("converte '0' e 'false' do multipart em false (não em true pela conversão implícita)", () => {
    const { instancia, campos } = validar(UpdateModeloTecnicoDto, {
      tem_furo: '0',
      tem_carga_foto: 'false',
      tem_dados_variaveis: '0',
      is_provisorio: '0',
    });
    expect(campos).toEqual([]);
    expect(instancia).toMatchObject({
      tem_furo: false,
      tem_carga_foto: false,
      tem_dados_variaveis: false,
      is_provisorio: false,
    });
  });

  it("converte '1' e 'true' em true", () => {
    const { instancia } = validar(UpdateModeloTecnicoDto, {
      tem_furo: '1',
      tem_carga_foto: 'true',
    });
    expect(instancia.tem_furo).toBe(true);
    expect(instancia.tem_carga_foto).toBe(true);
  });

  it('rejeita valor que não é booleano', () => {
    const { campos } = validar(UpdateModeloTecnicoDto, { tem_furo: 'talvez' });
    expect(campos).toEqual(['tem_furo']);
  });
});

describe('CreateModeloTecnicoDto', () => {
  const valido = {
    cliente_id: '1',
    produto_id: '1',
    tecnologia_id: '1',
    nome_modelo: 'Colaborador',
    campo_chave: 'matricula',
    posicionamento: 'vertical',
  };

  it("converte '0' do multipart em false", () => {
    const { instancia, campos } = validar(CreateModeloTecnicoDto, {
      ...valido,
      tem_furo: '0',
      tem_carga_foto: '0',
      tem_dados_variaveis: '0',
      is_provisorio: '0',
    });
    expect(campos).toEqual([]);
    expect(instancia).toMatchObject({
      tem_furo: false,
      tem_carga_foto: false,
      tem_dados_variaveis: false,
      is_provisorio: false,
    });
  });
});
