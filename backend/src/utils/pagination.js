// 单页条数上限：不限制时 ?limit=2147483647 会触发全量 readdir + 逐项 fs.stat
const MAX_PAGE_SIZE = 100;

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
