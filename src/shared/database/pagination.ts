/**
 * Normaliza parâmetros de paginação espelhando os repositories do Laravel:
 * `per_page` com teto defensivo de 100 e default 10; página mínima 1.
 */
export interface PaginationParams {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

export function resolvePagination(
  query: Record<string, unknown>,
  defaultPerPage = 10,
  maxPerPage = 100,
): PaginationParams {
  const rawPage = parseInt(String(query.page ?? query.pagina ?? '1'), 10);
  const rawPerPage = parseInt(
    String(query.per_page ?? query.perPage ?? defaultPerPage),
    10,
  );

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  let perPage =
    Number.isFinite(rawPerPage) && rawPerPage > 0 ? rawPerPage : defaultPerPage;
  perPage = Math.min(perPage, maxPerPage);

  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
    take: perPage,
  };
}
