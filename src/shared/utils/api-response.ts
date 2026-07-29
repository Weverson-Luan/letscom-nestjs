/**
 * Formato de resposta padrão da API — espelha o *ResponseHelper do Laravel:
 * { code, status, message, data, pagination }
 */
export interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiSuccessResponse<T = unknown> {
  code: number;
  status: 'success';
  message: string;
  data: T;
  pagination: Pagination | null;
}

export interface ApiErrorResponse {
  code: number;
  status: 'error';
  message: string;
  data: unknown[];
  pagination: null;
  errors?: unknown;
}

export class ApiResponse {
  static success<T>(
    message: string,
    data: T,
    pagination: Pagination | null = null,
    code = 200,
  ): ApiSuccessResponse<T> {
    return {
      code,
      status: 'success',
      message,
      data,
      pagination:
        pagination ??
        (Array.isArray(data)
          ? {
              current_page: 1,
              last_page: 1,
              per_page: 10,
              total: (data as unknown[]).length,
            }
          : null),
    };
  }

  static error(message: string, code = 500, errors?: unknown): ApiErrorResponse {
    return {
      code,
      status: 'error',
      message,
      data: [],
      pagination: null,
      ...(errors ? { errors } : {}),
    };
  }
}

/**
 * Constrói o objeto de paginação a partir dos parâmetros calculados,
 * espelhando o retorno do paginator do Laravel.
 */
export function buildPagination(
  total: number,
  page: number,
  perPage: number,
): Pagination {
  return {
    current_page: page,
    last_page: Math.max(1, Math.ceil(total / perPage)),
    per_page: perPage,
    total,
  };
}
