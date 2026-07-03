/**
 * 把产品图片自动发布为 Pinterest Pin
 *
 * 每个 Pin 需要：图片 + 标题 + 描述 + 链接（指向官网）+ 画板
 *
 * 用法：
 *   node publish-pinterest.js --dry                # 试运行（不真发，只打印将发什么）
 *   node publish-pinterest.js --cat Pandora        # 发某品类
 *   node publish-pinterest.js --id 1394292         # 发某产品
 *   node publish-pinterest.js --limit 5            # 只发前5个
 *   node publish-pinterest.js                      # 发全部（受 dailyLimit 限制）
 *
 * 前提：config.local.js 已填好 accessToken 和 defaultBoardId
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const local = require('./config.local');
const { listImagesByProduct } = require('./lib/image-utils');

const args = parseArgs(process.argv.slice(2));
const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));

// 检查授权
const TOKEN = local.pinterest.accessToken;
const BOARD_ID = local.pinterest.defaultBoardId;
const DRY = args.dry || local.publish.dryRun;

if (!DRY && (!TOKEN || !BOARD_ID)) {
  console.log('❌ 未配置 Pinterest 授权。请先：');
  console.log('   1. 在 config.local.js 填入 pinterest.accessToken 和 defaultBoardId');
  console.log('   2. 或用 --dry 参数试运行');
  process.exit(1);
}

// 过滤目标
let targets = products;
if (args.cat) targets = targets.filter(p => p.cat === args.cat);
if (args.id)  targets = targets.filter(p => p.id === args.id);
if (args.limit) targets = targets.slice(0, parseInt(args.limit));

// 限制每日数量
const limit = local.publish.pinterestDailyLimit || 30;
if (!DRY && targets.length > limit) {
  console.log(`⚠️ 本次将发 ${targets.length} 个，超过每日上限 ${limit}，只发前 ${limit} 个`);
  console.log(`   如需调整，改 config.local.js 的 pinterestDailyLimit`);
  targets = targets.slice(0, limit);
}

(async () => {
  console.log(`模式：${DRY ? '🔍 试运行(不真发)' : '🚀 正式发布'}`);
  console.log(`目标：${targets.length} 个产品\n`);

  let okCount = 0, failCount = 0;
  const failed = [];

  for (const p of targets) {
    try {
      await publishOne(p);
      okCount++;
    } catch (e) {
      failCount++;
      failed.push({ id: p.id, title: p.title, error: e.message });
      console.log(`  ❌ [${p.id}] ${p.title} —— ${e.message}`);
    }
    // 间隔2秒，避免触发限流
    if (!DRY) await sleep(2000);
  }

  console.log(`\n════════ 完成 ════════`);
  console.log(`${DRY ? '模拟' : '实际'}发布：成功 ${okCount}，失败 ${failCount}`);
  if (failed.length) failed.forEach(f => console.log(`  - ${f.id} ${f.title}: ${f.error}`));
})();

async function publishOne(p) {
  const imgs = listImagesByProduct(config.paths.sourceImages, p.id);
  if (imgs.length === 0) throw new Error('没有产品图片');

  const dict = config.catalogDict[p.cat] || {};
  const l1 = config.l1Dict[p.l1] || { en: 'Sintered Stone' };
  const title = buildPinTitle(p, dict, l1);
  const desc = buildPinDesc(p, dict, l1);
  const link = `https://www.sinteredstoneworld.com/products/`;

  // 用主图(第一张)发Pin
  const mainImg = imgs[0];

  if (DRY) {
    console.log(`  🔍 [模拟] [${p.id}] ${title}`);
    console.log(`          图: ${path.basename(mainImg)}  链接: ${link}`);
    return;
  }

  // Pinterest v5 API：用 multipart 上传图片再创建 Pin
  // 方法1（推荐）：直接用图片URL。但本地图片没有公开URL，
  // 这里采用方法2：先上传图片 media，再创建 Pin

  // 读取图片转 base64，用 media_source 上传
  const imgBuf = fs.readFileSync(mainImg);
  const contentType = 'image/jpeg';

  const body = {
    board_id: BOARD_ID,
    title: title.slice(0, 100),
    description: desc.slice(0, 800),
    link,
    media_source: {
      source_type: 'image_base64',
      content_type: contentType,
      data: imgBuf.toString('base64'),
    },
  };

  const resp = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (resp.ok && data.id) {
    console.log(`  ✅ [${p.id}] ${title} → Pin: ${data.id}`);
  } else {
    throw new Error(JSON.stringify(data).slice(0, 200));
  }
}

function buildPinTitle(p, dict, l1) {
  const color = dict.color || p.cat;
  const size = (p.size || '').replace(/×/g, 'x');
  if (p.l1 === 'slab') {
    return `${color} Luxury Sintered Stone Slab | Sintered Stone World`;
  } else if (p.l1 === 'furniture') {
    const type = dict.type || p.cat;
    return `${color} ${type} | Luxury Sintered Stone Furniture`;
  } else {
    return `${color} ${l1.en} | Sintered Stone World`;
  }
}

function buildPinDesc(p, dict, l1) {
  const c = config.company;
  const lines = [
    `${dict.color || p.cat} - Premium sintered stone for luxury interior design.`,
    `Size: ${(p.size || 'Custom').replace(/×/g, 'x')}`,
    ``,
    `Perfect for: kitchen countertop, bathroom vanity, feature wall, dining table, floor tile.`,
    `Heat resistant, scratch resistant, stain resistant, UV resistant.`,
    ``,
    `200+ luxury stone colors available. Custom sizes & OEM/ODM supported.`,
    `MOQ: 1 piece. Global shipping from Foshan, China.`,
    ``,
    `Contact: ${c.contact} | ${c.email} | WhatsApp ${c.whatsapp}`,
    `Website: ${c.website2}`,
  ];
  return lines.join('\n');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cat') out.cat = argv[++i];
    if (argv[i] === '--id')  out.id = argv[++i];
    if (argv[i] === '--limit') out.limit = argv[++i];
    if (argv[i] === '--dry') out.dry = true;
  }
  return out;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
