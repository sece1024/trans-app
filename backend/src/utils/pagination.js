// 从 query 中解析分页参数，返回 { limit, cursor }
function parsePagination(query) {
  const limit = Number.parseInt(query.limit, 10);
  const cursor = typeof query.cursor === 'string' && query.cursor !== '' ? query.cursor : undefined;
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    cursor,
  };
}

module.exports = parsePagination;
