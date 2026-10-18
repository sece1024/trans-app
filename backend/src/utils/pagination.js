// 单页条数上限：不限制时 ?limit=2147483647 会触发全量 readdir + 逐项 fs.stat
const MAX_PAGE_SIZE = 100;

// 未显式传 limit 时的默认页大小；与前端 usePaginatedList 的默认值保持一致。
// 服务层必须使用它兜底，否则 GET /api/files 不传 limit 会退化为全量扫描。
const DEFAULT_PAGE_SIZE = 50;

// 从 query 中解析分页参数，返回 { limit, cursor }
function parsePagination(query) {
  const limit = Number.parseInt(query.limit, 10);
  const cursor = typeof query.cursor === 'string' && query.cursor !== '' ? query.cursor : undefined;
  return {
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_PAGE_SIZE) : undefined,
    cursor,
  };
}

module.exports = parsePagination;
module.exports.MAX_PAGE_SIZE = MAX_PAGE_SIZE;
module.exports.DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE;
