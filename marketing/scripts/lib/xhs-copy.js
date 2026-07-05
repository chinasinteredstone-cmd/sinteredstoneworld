/**
 * 小红书文案解析 + 发布状态库读写
 *
 * - parseXhsCsv(): 解析 xhs-copy.csv（BOM + 引号内换行）
 * - StateStore:    发布状态库（publish-state.json）的增删改查
 */

const fs = require('fs');
const path = require('path');

/**
 * 解析 xhs-copy.csv
 * @param {string} csvPath
 * @returns {Array<Object>} 每行一个对象，key 为中文表头
 *
 * 表头：产品ID, 中文名, 板块, 品类, 尺寸, 小红书标题, 正文(种草文案), 话题标签
 */
function parseXhsCsv(csvPath) {
  let raw = fs.readFileSync(csvPath, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // 去 BOM

  const rows = parseCSV(raw);
  if (rows.length < 2) return [];

  const header = rows[0];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    // 跳过空行（全是空字符串）
    if (r.every(c => c.trim() === '')) continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = (r[j] || '').trim();
    }
    // 标准化字段名（去掉括号方便调用）
    obj.id = obj['产品ID'];
    obj.title = obj['小红书标题'];
    obj.body = obj['正文(种草文案)'];
    obj.tags = obj['话题标签'];
    obj.cat = obj['品类'];
    obj.l1 = obj['板块'];
    obj.size = obj['尺寸'];
    // 正文 + 话题 拼成发布用的完整正文
    obj.fullBody = (obj.body || '').replace(/\s+$/, '') + '\n\n' + (obj.tags || '');
    out.push(obj);
  }
  return out;
}

/**
 * 最小化 CSV 解析器：处理引号包裹的字段（含换行、逗号、转义双引号）
 */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }   // "" → "
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* 跳过 */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * 状态库
 *
 * 文件结构：
 * {
 *   version: 1,
 *   lastUpdated: ISO,
 *   byId: { "<productId>": { status, attempts, publishedAt, lastError, lastSlot } },
 *   daily: { "YYYY-MM-DD": { noon: id, evening: id, published: [], failed: [] } }
 * }
 *
 * status: pending | publishing | published | failed
 */
class StateStore {
  constructor(statePath) {
    this.path = statePath;
    this.data = this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.path, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      return { version: 1, lastUpdated: null, byId: {}, daily: {} };
    }
  }

  save() {
    this.data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  /** 确保某产品在 byId 里有记录 */
  ensure(id) {
    if (!this.data.byId[id]) {
      this.data.byId[id] = {
        status: 'pending',
        attempts: 0,
        publishedAt: null,
        lastError: null,
        lastSlot: null,
      };
    }
    return this.data.byId[id];
  }

  get(id) {
    return this.data.byId[id] || this.ensure(id);
  }

  /** 标记为发布中 */
  markPublishing(id, slot) {
    const s = this.ensure(id);
    s.status = 'publishing';
    s.lastSlot = slot || null;
    this.save();
  }

  /** 标记发布成功 */
  markPublished(id, slot) {
    const s = this.ensure(id);
    s.status = 'published';
    s.publishedAt = new Date().toISOString();
    s.lastError = null;
    this.save();
    this._recordDaily(slot, id, 'published');
  }

  /** 标记发布失败（attempts+1），超过上限则永久 failed */
  markFailed(id, slot, error, maxAttempts) {
    const s = this.ensure(id);
    s.attempts += 1;
    s.lastError = String(error).slice(0, 500);
    s.lastSlot = slot || null;
    // 超过重试上限 → 永久 failed；否则保持 failed 待下次重试
    if (s.attempts >= (maxAttempts || 3)) {
      s.status = 'failed';
    } else {
      s.status = 'failed';
    }
    this.save();
    this._recordDaily(slot, id, 'failed');
    return s;
  }

  /** 标记回 pending（用于重试） */
  resetToPending(id) {
    const s = this.ensure(id);
    s.status = 'pending';
    this.save();
  }

  _recordDaily(slot, id, result) {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.data.daily[today]) {
      this.data.daily[today] = { published: [], failed: [], noon: null, evening: null };
    }
    const d = this.data.daily[today];
    if (slot) d[slot] = id;
    if (result === 'published' && !d.published.includes(id)) d.published.push(id);
    if (result === 'failed' && !d.failed.includes(id)) d.failed.push(id);
    this.save();
  }

  /**
   * 选品：从 candidates 中按给定顺序选出 count 个可发布的
   * 规则：status=pending 优先；其次 status=failed 且 attempts<maxAttempts（重试）
   * 已 published 的永不重选
   * @param {Array<{id:string}>} candidates  已按期望发布顺序排好
   * @param {number} count
   * @param {number} maxAttempts
   * @returns {Array<string>}  选中的产品ID
   */
  pickForPublish(candidates, count, maxAttempts) {
    const picked = [];
    const seen = new Set();
    for (const c of candidates) {
      if (picked.length >= count) break;
      const id = c.id;
      if (seen.has(id)) continue;
      seen.add(id);
      const s = this.ensure(id);
      if (s.status === 'published') continue;
      if (s.status === 'pending') {
        picked.push(id);
        continue;
      }
      if (s.status === 'failed' && s.attempts < maxAttempts) {
        picked.push(id);
        continue;
      }
      // publishing 卡住的（上次中断）→ 允许重试
      if (s.status === 'publishing') {
        picked.push(id);
        continue;
      }
    }
    return picked;
  }

  /** 统计 */
  stats() {
    const byId = this.data.byId;
    let published = 0, pending = 0, failed = 0, publishing = 0;
    for (const id in byId) {
      const s = byId[id].status;
      if (s === 'published') published++;
      else if (s === 'pending') pending++;
      else if (s === 'failed') failed++;
      else if (s === 'publishing') publishing++;
    }
    return { published, pending, failed, publishing, total: published + pending + failed + publishing };
  }
}

module.exports = { parseXhsCsv, StateStore };
