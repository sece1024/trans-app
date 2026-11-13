const express = require('express');
const router = express.Router();
const clipboardService = require('../services/clipboardService');
const clipboardEvents = require('../services/clipboardEvents');
const parsePagination = require('../utils/pagination');
const normalizeCategory = require('../utils/normalizeCategory');
const logger = require('../config/logger');
const { MAX_CLIPBOARD_LENGTH } = require('../config/limits');

// deviceInfo 由客户端生成（设备 · 浏览器），正常约 30 字符；上限防御异常/恶意超长输入
const MAX_DEVICE_INFO_LENGTH = 256;

// 客户端实例 ID 由前端生成（UUID，36 字符），仅用于在 SSE 广播里回显给自己
const MAX_CLIENT_ID_LENGTH = 64;

// 读取发起本次写操作的客户端 ID：缺失或非法时返回 undefined（退化为「无法识别来源」）
function readClientId(req) {
  const raw = req.get('x-client-id');
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_CLIENT_ID_LENGTH) return undefined;
  return trimmed;
}

// 从请求体读取分类字段：present=false 表示未传（POST 视为未分类），
// present=true 时 category 为归一化结果（null = 未分类）或 error 提示
function readCategoryField(body) {
  if (!Object.prototype.hasOwnProperty.call(body ?? {}, 'category')) {
    return { present: false };
  }
  try {
    return { present: true, category: normalizeCategory(body.category) };
  } catch (error) {
    return { present: true, error: error.message };
  }
}

// 按名称精准匹配前先归一化：用户可能手工拼 URL，名称里的空白/全角空格要能对上
function readCategoryParam(raw) {
  try {
    return normalizeCategory(raw);
  } catch {
    return null;
  }
}

// SSE：剪贴板变更实时推送，替代前端轮询
router.get('/clipboard/events', (req, res) => {
  // 连接数上限：GET 端点不在写限流范围内，用硬上限兜底
  if (clipboardEvents.clientCount() >= clipboardEvents.MAX_CLIENTS) {
    return res.status(503).json({ message: 'Too many SSE connections' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  // 断线后 EventSource 按此间隔自动重连
  res.write('retry: 3000\n\n');

  clipboardEvents.subscribe(res);

  // 统一清理：无论连接正常关闭还是写入报错（连接已断开但 close 未触发），
  // 都要停掉心跳并剔除客户端，避免心跳定时器泄漏 / 残留死连接占用集合。
  const cleanup = () => {
    clearInterval(heartbeat);
    clipboardEvents.unsubscribe(res);
  };

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      cleanup();
    }
  }, 15000);

  req.on('close', cleanup);
});

router.post('/clipboard', (req, res, next) => {
  try {
    const { text, deviceInfo } = req.body;
    const categoryField = readCategoryField(req.body);

    if (!text) {
      return res.status(400).json({ message: 'content is required' });
    }

    if (typeof text !== 'string' || text.length > MAX_CLIPBOARD_LENGTH) {
      return res.status(400).json({ message: 'Content too long' });
    }

    if (
      deviceInfo !== undefined &&
      deviceInfo !== null &&
      (typeof deviceInfo !== 'string' || deviceInfo.length > MAX_DEVICE_INFO_LENGTH)
    ) {
      return res.status(400).json({ message: 'Invalid deviceInfo' });
    }

    if (categoryField.present && categoryField.error) {
      return res.status(400).json({ message: categoryField.error });
    }

    const clips = clipboardService.saveTextContent(
      text,
      'text',
      deviceInfo,
      categoryField.present ? categoryField.category : undefined
    );
    clipboardEvents.notify({ type: 'created', item: clips, originId: readClientId(req) });
    res.json(clips);
  } catch (error) {
    logger.error('clipboard save failed:', error);
    next(error);
  }
});

router.get('/clipboard', (req, res, next) => {
  try {
    const { limit, cursor } = parsePagination(req.query);

    // 分类筛选：未传 = 全部，空串 = 未分类，其余按归一化后的名称精确匹配
    let category;
    if (req.query.category !== undefined) {
      if (typeof req.query.category !== 'string') {
        return res.status(400).json({ message: 'Invalid category' });
      }
      try {
        category = normalizeCategory(req.query.category);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    res.json(clipboardService.getTextHistory({ limit, cursor, category }));
  } catch (error) {
    logger.error('clipboard get failed:', error);
    next(error);
  }
});

router.get('/clipboard/categories', (req, res, next) => {
  try {
    res.json(clipboardService.getCategorySummary());
  } catch (error) {
    logger.error('clipboard categories failed:', error);
    next(error);
  }
});

// 分类级操作：重命名（目标已存在即合并）。分类名走路径参数，前端负责 encodeURIComponent。
router.put('/clipboard/categories/:name', (req, res, next) => {
  try {
    const from = readCategoryParam(req.params.name);
    if (!from) return res.status(400).json({ message: 'Invalid category' });

    let to;
    try {
      to = normalizeCategory(req.body?.name);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    // 改成空名等同于「清空分类」，那是 DELETE 的语义，避免两个入口做同一件事
    if (!to) return res.status(400).json({ message: 'name is required' });

    if (to === from) {
      return res.json({ message: 'No changes', from, to, changes: 0 });
    }

    const changes = clipboardService.renameCategory(from, to);
    if (changes === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    clipboardEvents.notify({
      type: 'category-renamed',
      from,
      to,
      originId: readClientId(req),
    });
    res.json({ message: 'Renamed successfully', from, to, changes });
  } catch (error) {
    logger.error('clipboard category rename failed:', error);
    next(error);
  }
});

// 分类级操作：清空（该分类下条目改为未分类，分类本身随条数归零而消失）
router.delete('/clipboard/categories/:name', (req, res, next) => {
  try {
    const name = readCategoryParam(req.params.name);
    if (!name) return res.status(400).json({ message: 'Invalid category' });

    const changes = clipboardService.clearCategory(name);
    if (changes === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    clipboardEvents.notify({ type: 'category-cleared', from: name, originId: readClientId(req) });
    res.json({ message: 'Cleared successfully', from: name, changes });
  } catch (error) {
    logger.error('clipboard category clear failed:', error);
    next(error);
  }
});

router.patch('/clipboard/:contentId', (req, res, next) => {
  try {
    const categoryField = readCategoryField(req.body);

    // PATCH 只用于改分类：必须显式携带 category（null / 空串 = 清除分类）
    if (!categoryField.present) {
      return res.status(400).json({ message: 'category is required' });
    }
    if (categoryField.error) {
      return res.status(400).json({ message: categoryField.error });
    }

    const changes = clipboardService.updateCategory(req.params.contentId, categoryField.category);
    if (changes === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    clipboardEvents.notify({
      type: 'updated',
      id: String(req.params.contentId),
      category: categoryField.category,
      originId: readClientId(req),
    });
    res.json({ message: 'Updated successfully', category: categoryField.category });
  } catch (error) {
    logger.error('clipboard category update failed:', error);
    next(error);
  }
});

router.delete('/clipboard/:contentId', (req, res, next) => {
  try {
    const contentId = req.params.contentId;
    const changes = clipboardService.delete(contentId);
    if (changes === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    clipboardEvents.notify({ type: 'deleted', id: String(contentId), originId: readClientId(req) });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    logger.error('clipboard delete failed:', error);
    next(error);
  }
});

module.exports = router;
