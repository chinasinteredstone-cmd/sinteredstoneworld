/**
 * 小红书每日自动发布 · 主入口
 *
 * 用法：
 *   node publish-xhs.js --dry                  # 试运行（走完填表流程，不点发布）
 *   node publish-xhs.js --count 2              # 正式发2篇（默认数量从 config 读取）
 *   node publish-xhs.js --count 1 --slot noon  # 发当天"中午"时段1篇（计划任务用）
 *   node publish-xhs.js --count 1 --slot evening
 *   node publish-xhs.js --id 1394292           # 只发指定产品（调试）
 *   node publish-xhs.js --cat Pandora          # 只在某品类里选
 *   node publish-xhs.js --retry-failed         # 只重试之前失败的
 *   node publish-xhs.js --list                 # 查看状态统计，不发
 *
 * 状态库：marketing/xiaohongshu/publish-state.json
 *   - 已 published 的永不重发
 *   - failed 且 attempts<max 的会被自动重试
 *   - failed 且 attempts>=max 的需人工介入（可 --retry-failed 强制重置）
 *
 * 前提：agent-browser 的 --session xhs 已登录（首次 --headed 手动登录一次）
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const local = require('./config.local');
const { parseXhsCsv, StateStore } = require('./lib/xhs-copy');
const { publishOne, sleep } = require('./lib/xhs-browser');

const args = parseArgs(process.argv.slice(2));

// 解析 dry 标志：--dry 显式开；--no-dry 显式关；否则用 config
let DRY;
if (args.dry === true) DRY = true;
else if (args['no-dry'] === true) DRY = false;
else DRY = local.publish.dryRun; // 默认安全开

const SLOT = args.slot || null;            // 'noon' | 'evening' | null
const COUNT = args.count
  ? parseInt(args.count)
  : (SLOT ? 1 : (local.publish.xhsDailyCount || 2));
const MAX_ATTEMPTS = local.publish.xhsMaxAttempts || 3;

// 路径
const XHS_DIR = config.paths.xhs;
const STATE_PATH = config.paths.xhsState;
const LOG_PATH = config.paths.xhsLog;
const REPORTS_DIR = config.paths.xhsReports;
const SHOTS_DIR = path.join(REPORTS_DIR, 'imgs');

// 确保目录存在
for (const d of [REPORTS_DIR, SHOTS_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

// 日志器：控制台 + 文件双写
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
const logger = {
  log: (msg) => {
    const line = `[${ts()}] ${msg}`;
    console.log(line);
    logStream.write(line + '\n');
  },
  err: (msg) => {
    const line = `[${ts()}] ❌ ${msg}`;
    console.error(line);
    logStream.write(line + '\n');
  },
};

// ─── main ───
(async () => {
  logger.log('══════════ 小红书发布任务开始 ══════════');
  logger.log(`模式：${DRY ? '🔍 试运行(不真发)' : '🚀 正式发布'} | 时段：${SLOT || '不限'} | 计划数量：${COUNT}`);

  // 1. 读文案
  const allRows = parseXhsCsv(config.paths.xhsCopy);
  logger.log(`读取文案：${allRows.length} 款产品`);

  // 2. 状态库
  const state = new StateStore(STATE_PATH);
  // 初始化：把所有产品都 ensure 进 byId（首次运行）
  allRows.forEach(r => state.ensure(r.id));

  // --list：只看统计
  if (args.list) {
    printStats(state, allRows);
    logStream.end();
    return;
  }

  // --retry-failed：把所有 failed 的重置为 pending
  if (args['retry-failed']) {
    let resetN = 0;
    for (const id in state.data.byId) {
      if (state.data.byId[id].status === 'failed') {
        state.resetToPending(id);
        resetN++;
      }
    }
    logger.log(`已重置 ${resetN} 个 failed 产品为 pending`);
  }

  // 3. 选品
  let candidates = allRows;
  if (args.cat) candidates = candidates.filter(r => r.cat === args.cat);

  let targets;
  if (args.id) {
    // 指定单款
    const found = allRows.find(r => r.id === args.id);
    if (!found) {
      logger.err(`找不到产品 id=${args.id}`);
      logStream.end();
      process.exit(1);
    }
    targets = [found];
  } else if (args['retry-failed']) {
    // 重试模式下，选所有 pending + 重置后的 failed
    targets = allRows.filter(r => {
      const s = state.get(r.id).status;
      return s === 'pending' || s === 'failed';
    }).slice(0, COUNT);
  } else {
    const pickedIds = state.pickForPublish(candidates, COUNT, MAX_ATTEMPTS);
    targets = allRows.filter(r => pickedIds.includes(r.id));
  }

  if (targets.length === 0) {
    logger.log('没有可发布的产品（可能全部已发布或都在失败上限内）');
    printStats(state, allRows);
    logStream.end();
    return;
  }

  logger.log(`本次目标：${targets.map(t => t.id).join(', ')}`);

  // 4. 逐篇发布
  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const shotPath = path.join(SHOTS_DIR, `${p.id}-${SLOT || 'manual'}-${dateStr()}.png`);

    state.markPublishing(p.id, SLOT);
    try {
      const r = await publishOne({
        product: p,
        xhsDir: XHS_DIR,
        publishUrl: local.xiaohongshu.publishUrl,
        dry: DRY,
        shotPath,
        logger,
      });
      if (!DRY) {
        state.markPublished(p.id, SLOT);
      }
      results.push({ id: p.id, title: p.title, ok: true, dry: DRY, noteUrl: r.noteUrl, shot: r.screenshot });
    } catch (e) {
      state.markFailed(p.id, SLOT, e.message, MAX_ATTEMPTS);
      logger.err(`[${p.id}] ${p.title} —— ${e.message}`);
      results.push({ id: p.id, title: p.title, ok: false, error: e.message });

      // 登录过期：立即中止本轮（后续也发不了）
      if (e.message.includes('NEEDS_LOGIN')) {
        logger.err('检测到登录过期，中止本轮发布。请用 agent-browser --session xhs --headed open <url> 重新登录。');
        break;
      }
    }

    // 篇间随机延迟（防风控），最后一篇不用等
    if (i < targets.length - 1) {
      const delay = DRY ? 2000 : 180000 + Math.random() * 180000; // 真发时 3-6 分钟
      logger.log(`篇间等待 ${Math.round(delay / 1000)}s ...`);
      await sleep(delay);
    }
  }

  // 5. 报告
  const okN = results.filter(r => r.ok).length;
  const failN = results.length - okN;
  logger.log(`══════════ 完成：成功 ${okN}，失败 ${failN} ══════════`);
  writeDailyReport(state, results, DRY);
  printStats(state, allRows);

  logStream.end();
})();

// ─── 辅助 ───

function writeDailyReport(state, results, dry) {
  const today = dateStr();
  const file = path.join(REPORTS_DIR, `${today}.md`);
  const lines = [
    `# 小红书发布报告 ${today}`,
    '',
    `- 模式：${dry ? '🔍 试运行' : '🚀 正式发布'}`,
    `- 时段：${SLOT || '不限'}`,
    `- 结果：成功 ${results.filter(r => r.ok).length} / 失败 ${results.filter(r => !r.ok).length}`,
    '',
    '## 本次发布',
    '',
    '| 产品ID | 标题 | 结果 | 备注 |',
    '|---|---|---|---|',
    ...results.map(r => `| ${r.id} | ${r.title} | ${r.ok ? '✅' : '❌'} | ${r.error || (r.dry ? '试运行' : '已发布')} |`),
    '',
    '## 总体进度',
    '',
    '```',
    JSON.stringify(state.stats(), null, 2),
    '```',
    '',
  ];
  // 追加到当天报告（中午/傍晚可能各跑一次）
  const append = fs.existsSync(file);
  fs.writeFileSync(file, (append ? fs.readFileSync(file, 'utf-8') + '\n\n---\n\n' : '') + lines.join('\n'), 'utf-8');
  logger.log(`报告已写入 ${file}`);
}

function printStats(state, allRows) {
  const s = state.stats();
  console.log('\n────── 状态统计 ──────');
  console.log(`  总产品：${allRows.length}`);
  console.log(`  已发布：${s.published}`);
  console.log(`  待发布：${s.pending}`);
  console.log(`  失败  ：${s.failed}（其中达上限需人工：${countMaxFailed(state)}）`);
  console.log(`  发布中：${s.publishing}`);
  console.log(`  剩余进度：${s.published}/${allRows.length}（${((s.published / allRows.length) * 100).toFixed(1)}%）`);
  console.log('────────────────────\n');
}

function countMaxFailed(state) {
  let n = 0;
  for (const id in state.data.byId) {
    if (state.data.byId[id].status === 'failed' && state.data.byId[id].attempts >= MAX_ATTEMPTS) n++;
  }
  return n;
}

function ts() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}
function dateStr() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') out.dry = true;
    else if (a === '--no-dry') out['no-dry'] = true;
    else if (a === '--count') out.count = argv[++i];
    else if (a === '--slot') out.slot = argv[++i];
    else if (a === '--id') out.id = argv[++i];
    else if (a === '--cat') out.cat = argv[++i];
    else if (a === '--retry-failed') out['retry-failed'] = true;
    else if (a === '--list') out.list = true;
  }
  return out;
}
