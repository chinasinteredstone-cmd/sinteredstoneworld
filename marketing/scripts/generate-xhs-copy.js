/**
 * 生成小红书种草文案（标题 + 正文 + 话题标签）
 *
 * 小红书爆款逻辑：
 *   - 标题：20字内，制造好奇心/痛点/利益，可加emoji符号但不能依赖渲染
 *   - 正文：痛点引入 → 产品介绍 → 卖点罗列 → 行动号召，多用换行和短句
 *   - 标签：6-10个相关话题，覆盖搜索流量
 *
 * 用法：
 *   node generate-xhs-copy.js                # 全部
 *   node generate-xhs-copy.js --cat Pandora  # 某品类
 *
 * 输出 CSV：marketing/xiaohongshu/xhs-copy.csv
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const args = parseArgs(process.argv.slice(2));
const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));

let targets = products;
if (args.cat) targets = targets.filter(p => p.cat === args.cat);

// ===== 文案生成逻辑 =====

function buildTitle(p, dict, l1Copy) {
  const nick = dict.nick || p.cat || '奢石';
  const hook = dict.hook ? dict.hook[0] : '';
  const scene = l1Copy.场景 ? l1Copy.场景[0] : '';

  // 多套标题模板，按板块选
  const templates = {
    slab: [
      `${nick}奢石｜${scene}高级感天花板`,
      `被问疯了！${nick}背景墙实景`,
      `别墅同款${nick}｜一面墙封神`,
      `${nick}烧结石｜${l1Copy.卖点 ? l1Copy.卖点[0] : '高级感'}`,
      `颜值暴击！${nick}大板实景分享`,
    ],
    furniture: [
      `${nick}｜提升客厅格调的秘密`,
      `被邻居追着问的${nick}！`,
      `${nick}推荐｜${scene}颜值担当`,
      `一眼爱上的${nick}，轻奢必备`,
      `${nick}实拍｜高级感拿捏了`,
    ],
    accessory: [
      `${nick}搭配｜装修细节加分项`,
      `${nick}选款指南，建议收藏`,
    ],
    case: [
      `${nick}实景落地｜效果绝了`,
      `${nick}完工案例，设计还原度100%`,
    ],
  };
  const pool = templates[p.l1] || templates.slab;
  // 用产品ID做种子保持稳定，避免每次随机不同
  const idx = parseInt(p.id) % pool.length;
  let title = pool[idx];
  if (title.length > 20) title = title.slice(0, 20);
  return title;
}

function buildBody(p, dict, l1Copy) {
  const nick = dict.nick || p.cat || '奢石';
  const lines = [];

  // 开头：场景化引入（小红书风格，短句+换行）
  lines.push(`终于等到这款${nick}了！`);
  lines.push('');
  if (p.l1 === 'slab') {
    lines.push('做了很久背景墙功课，');
    lines.push(`看到这块${nick}实景的瞬间，直接定下来。`);
  } else if (p.l1 === 'furniture') {
    lines.push('为了客厅的高级感，');
    lines.push(`挑了好久终于入手这款${nick}。`);
  } else {
    lines.push('终于找到满意的了。');
  }
  lines.push('');
  lines.push('—— 为什么选它 ——');
  lines.push('');

  // 卖点罗列
  const sells = l1Copy.卖点 || ['高级感', '耐磨耐高温', '独一无二纹理'];
  sells.forEach(s => lines.push(`✓ ${s}`));
  lines.push('');

  // 规格信息
  if (p.size) {
    lines.push(`📐 规格：${p.size.replace(/×/g, '×')}`);
  }
  lines.push(`🏷️ 材质：烧结石 / 天然奢石`);
  lines.push('');

  // 适用场景
  lines.push('—— 适用场景 ——');
  lines.push('');
  const scenes = l1Copy.场景 || ['客厅', '餐厅', '玄关'];
  scenes.forEach(s => lines.push(`▸ ${s}`));
  lines.push('');

  // 行动号召
  lines.push('同款/其他花色可定制，');
  lines.push('想要了解更多评论区扣「1」或私信～');
  lines.push('');

  return lines.join('\n');
}

function buildTags(p, dict) {
  const tags = dict.tags || config.xhsDict._default.tags;
  return tags.join(' ');
}

// ===== 生成 CSV =====

const rows = [];
rows.push(['产品ID', '中文名', '板块', '品类', '尺寸',
           '小红书标题', '正文(种草文案)', '话题标签']);

for (const p of targets) {
  const dict = config.xhsDict[p.cat] || config.xhsDict._default;
  const l1Copy = config.xhsL1Copy[p.l1] || config.xhsL1Copy.slab;
  rows.push([
    p.id, p.title, p.l1, p.cat, p.size,
    buildTitle(p, dict, l1Copy),
    buildBody(p, dict, l1Copy),
    buildTags(p, dict),
  ]);
}

const outPath = path.join(path.dirname(config.paths.outputRoot), 'xiaohongshu', 'xhs-copy.csv');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

let csv = '\ufeff';
for (const row of rows) {
  csv += row.map(cell => {
    const s = String(cell == null ? '' : cell);
    if (/[",\n\r"]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',') + '\r\n';
}
fs.writeFileSync(outPath, csv, 'utf-8');

console.log(`生成完成：${targets.length} 款产品文案`);
console.log(`输出：${outPath}`);
console.log(`\n=== 样例（前3款）===`);
for (const p of targets.slice(0, 3)) {
  const dict = config.xhsDict[p.cat] || config.xhsDict._default;
  const l1Copy = config.xhsL1Copy[p.l1] || config.xhsL1Copy.slab;
  console.log(`\n[${p.id}] ${p.title}`);
  console.log(`  标题: ${buildTitle(p, dict, l1Copy)}`);
  console.log(`  标签: ${buildTags(p, dict)}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cat') out.cat = argv[++i];
  }
  return out;
}
