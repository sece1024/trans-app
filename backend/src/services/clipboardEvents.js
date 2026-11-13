// 剪贴板变更的 SSE 客户端集合。单进程内存即可（编译二进制为单实例），无需跨进程协调。
const clients = new Set();

// SSE 订阅上限：该端点是 GET 不受写限流保护，不限连接数会被长连接耗尽句柄/内存
const MAX_CLIENTS = 64;

function subscribe(res) {
  clients.add(res);
}

function unsubscribe(res) {
  clients.delete(res);
}

/**
 * 向所有在线客户端广播剪贴板变更事件。
 *
 * 事件必须自带「变更是什么」（type + 受影响的 id / 分类），否则每个订阅者都只能
 * 全量失效重拉列表与汇总——一次改分类会放大成 N 个客户端的 2 次请求，
 * 且重拉第一页会丢掉分页进度。payload 由前端 `utils/clipboardListPatch.js` 消费。
 *
 * - `originId`：发起这次写操作的客户端 ID（取自 `X-Client-Id` 请求头）。
 *   SSE 广播无法定向排除发起者，由发起方自己按此字段忽略回显，避免重复应用。
 *
 * @param {{type: 'created'|'updated'|'deleted', item?: Object, id?: string,
 *          category?: string|null, originId?: string}} event 变更事件
 */
function notify(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      // 连接已断开但尚未触发 close，直接剔除
      clients.delete(client);
    }
  }
}

function clientCount() {
  return clients.size;
}

module.exports = { subscribe, unsubscribe, notify, clientCount, MAX_CLIENTS };
