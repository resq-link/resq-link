/**
 * Fetch every page of a filtered admin list until complete or safety limits hit.
 * Respects API pageSize caps (typically 50–100).
 */
export async function fetchAllFilteredPages<T>(options: {
  fetchPage: (
    page: number,
    pageSize: number
  ) => Promise<{ items: T[]; total: number; hasMore?: boolean }>
  pageSize?: number
  maxRows?: number
}): Promise<T[]> {
  const pageSize = options.pageSize ?? 50
  const maxRows = options.maxRows ?? 2000
  const all: T[] = []
  let page = 1

  while (all.length < maxRows && page <= 80) {
    const result = await options.fetchPage(page, pageSize)
    if (!result.items.length) break
    all.push(...result.items)

    const reachedTotal = result.total > 0 && all.length >= result.total
    const shortPage = result.items.length < pageSize
    const noMore = result.hasMore === false

    if (reachedTotal || shortPage || noMore) break
    page += 1
  }

  return all.slice(0, maxRows)
}
