const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const BaseService = require('./baseService');

class FileService extends BaseService {
  constructor(uploadDir, { includeSize = false } = {}) {
    super(uploadDir);
    this.includeSize = includeSize;
  }

  async list({ limit, cursor } = {}) {
    if (!fsSync.existsSync(this.uploadDir)) {
      return { items: [], total: 0, hasMore: false, nextCursor: null };
    }
    const files = await fs.readdir(this.uploadDir);

    // 装饰-排序-还原：预计算时间戳，避免比较器在排序过程中反复 parse 文件名前缀。
    // 稳定降序（ts 相同保持 readdir 原序），与 sortByTimeDesc 行为一致。
    const decorated = files.map((name) => ({ name, ts: this.getTimestamp(name) }));
    decorated.sort((a, b) => b.ts - a.ts);
    const total = decorated.length;

    let start = 0;
    if (cursor) {
      start = findCursorIndex(decorated, cursor, this.getTimestamp(cursor));
    }

    const page = decorated.slice(start, limit ? start + limit : decorated.length);
    const items = await Promise.all(
      page.map(async ({ name }) => {
        const info = { filename: name, originalName: this.getOriginalName(name) };
        if (this.includeSize) {
          info.size = (await fs.stat(path.join(this.uploadDir, name))).size;
        }
        return info;
      })
    );
    const hasMore = start + page.length < total;
    const nextCursor = page.length > 0 ? page[page.length - 1].name : null;
    return { items, total, hasMore, nextCursor };
  }
}

// 在按 ts 降序的装饰数组中二分定位 cursor 所处位置的下一项下标。
// 所有文件名对应的时间戳唯一时 O(log n)；cursor 已被删除等异常时返回 total（空页），
// 与旧实现 indexOf 未命中即到尾的行为一致。
function findCursorIndex(decorated, cursor, cursorTs) {
  // 找第一个 ts <= cursorTs 的下标（降序数组的 lower bound，指针为元素的逆序区间）
  let lo = 0;
  let hi = decorated.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (decorated[mid].ts > cursorTs) lo = mid + 1;
    else hi = mid;
  }
  // 同时间戳区间内线性比对文件名（正常情况下该区间只有 1~2 项）
  for (let i = lo; i < decorated.length && decorated[i].ts === cursorTs; i += 1) {
    if (decorated[i].name === cursor) return i + 1;
  }
  return decorated.length;
}

module.exports = FileService;
