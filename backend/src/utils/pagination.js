// 从 query 中解析分页参数，返回 { limit, offset }
function parsePagination(query) {
  const limit = Number.parseInt(query.limit, 10);
  const offset = Number.parseInt(query.offset, 10);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
  };
}

module.exports = parsePagination;
