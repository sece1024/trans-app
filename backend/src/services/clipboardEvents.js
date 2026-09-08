// 剪贴板变更的 SSE 客户端集合。单进程内存即可（编译二进制为单实例），无需跨进程协调。
const clients = new Set();

function subscribe(res) {
  clients.add(res);
}

function unsubscribe(res) {
  clients.delete(res);
}

// 向所有在线客户端广播剪贴板变更事件
function notify(type) {
  const payload = `data: ${JSON.stringify({ type })}\n\n`;
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

module.exports = { subscribe, unsubscribe, notify, clientCount };
