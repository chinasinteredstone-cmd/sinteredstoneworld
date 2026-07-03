/**
 * 生成小红书图片素材（封面 + 内页，3:4 竖图 1242×1656）
 *
 * 设计逻辑：
 *   - 封面：产品主图(顶部) + 金色标题区(底部)，突出中文花色名
 *   - 内页：每张产品图 + 底部金条卖点说明，最多8张内页
 *
 * 用法：
 *   node generate-xhs-images.js                # 全部200款
 *   node generate-xhs-images.js --cat Pandora  # 某品类
 *   node generate-xhs-images.js --id 1394292   # 某产品
 *
 * 输出：marketing/xiaohongshu/{productId}/
 *        ├── cover.jpg          封面
 *        ├── 2.jpg ~ 9.jpg      内页（最多8张）
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('./config');
const { listImagesByProduct } = require('./lib/image-utils');
const blocks = require('./lib/xhs-blocks');

const args = parseArgs(process.argv.slice(2));
const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));

let targets = products;
if (args.cat) targets = targets.filter(p => p.cat === args.cat);
if (args.id)  targets = targets.filter(p => p.id === args.id);

const outRoot = path.join(path.dirname(config.paths.outputRoot), 'xiaohongshu');
fs.mkdirSync(outRoot, { recursive: true });

(async () => {
  console.log(`开始生成小红书图片：共 ${targets.length} 款产品\n`);

  let okCount = 0;
  const failed = [];

  for (const p of targets) {
    try {
      const count = await generateOne(p);
      okCount++;
      console.log(`  ✅ [${p.id}] ${p.title} → 封面 + ${count - 1} 内页`);
    } catch (e) {
      failed.push({ id: p.id, title: p.title, error: e.message });
      console.log(`  ❌ [${p.id}] ${p.title} —— ${e.message}`);
    }
  }

  console.log(`\n========== 完成 ==========`);
  console.log(`成功：${okCount}/${targets.length}`);
  if (failed.length) {
    console.log(`失败 ${failed.length} 款：`);
    failed.forEach(f => console.log(`  - ${f.id} ${f.title}: ${f.error}`));
  }
})();

async function generateOne(p) {
  const imgs = listImagesByProduct(config.paths.sourceImages, p.id);
  if (imgs.length === 0) throw new Error('没有找到产品图片');

  // 取主图(第1张)做封面背景，其余做内页（最多8张）
  const coverImg = imgs[0];
  const innerImgs = imgs.slice(1, 1 + config.xiaohongshu.inner.maxCount);

  // 准备文案
  const dict = config.xhsDict[p.cat] || config.xhsDict._default;
  const l1Copy = config.xhsL1Copy[p.l1] || config.xhsL1Copy.slab;
  const bigTitle = pickTitle(p, dict);
  const subLines = buildSubLines(p, dict, l1Copy);

  const outDir = path.join(outRoot, p.id);
  fs.mkdirSync(outDir, { recursive: true });

  // === 1. 封面 ===
  // 方案：先建 1242×1656 画布，顶部放产品图(1196高)，底部金条区(460高)由SVG绘制
  const titleBarH = 460;
  const coverImgTargetH = blocks.H - titleBarH; // 1196
  const coverImgBuf = await sharp(coverImg)
    .resize({ width: blocks.W, height: coverImgTargetH, fit: 'cover', position: 'centre' })
    .flatten({ background: '#1a1a1a' })
    .jpeg({ quality: 90 })
    .toBuffer();

  // 创建完整画布（白底）→ 合成顶部图片(在0,0) → 合成SVG覆盖层(在0,0)
  const coverSvg = blocks.coverOverlay(p, bigTitle, subLines);
  await sharp({
    create: { width: blocks.W, height: blocks.H, channels: 3, background: '#1a1a1a' },
  })
    .composite([
      { input: coverImgBuf, top: 0, left: 0 },
      { input: coverSvg, top: 0, left: 0 },
    ])
    .jpeg({ quality: config.xiaohongshu.cover.quality })
    .toFile(path.join(outDir, 'cover.jpg'));

  // === 2. 内页 ===
  let pageNum = 2;
  const captions = buildInnerCaptions(p, dict, l1Copy, innerImgs.length);
  for (let i = 0; i < innerImgs.length; i++) {
    const barH = 200;
    const innerImgH = blocks.H - barH; // 1456
    const innerImgBuf = await sharp(innerImgs[i])
      .resize({ width: blocks.W, height: innerImgH, fit: 'cover', position: 'centre' })
      .flatten({ background: '#1a1a1a' })
      .jpeg({ quality: 88 })
      .toBuffer();

    const innerSvg = blocks.innerOverlay(captions[i] || captions[captions.length - 1]);
    await sharp({
      create: { width: blocks.W, height: blocks.H, channels: 3, background: '#1a1a1a' },
    })
      .composite([
        { input: innerImgBuf, top: 0, left: 0 },
        { input: innerSvg, top: 0, left: 0 },
      ])
      .jpeg({ quality: config.xiaohongshu.inner.quality })
      .toFile(path.join(outDir, `${pageNum}.jpg`));
    pageNum++;
  }

  return 1 + innerImgs.length; // 封面 + 内页数
}

// 选封面大标题：优先用花色昵称，其次品类昵称
function pickTitle(p, dict) {
  // 大板类用花色昵称（潘多拉/普拉达绿等），家具类用品类昵称（奢石茶几等）
  if (p.l1 === 'slab' || p.l1 === 'case') {
    return dict.nick || p.cat || '奢石';
  } else {
    return dict.nick || p.cat || '奢石';
  }
}

// 封面副标题：2-3行
function buildSubLines(p, dict, l1Copy) {
  const lines = [];
  // 第1行：hook词
  if (dict.hook && dict.hook[0]) lines.push(dict.hook[0]);
  // 第2行：卖点
  if (l1Copy.卖点 && l1Copy.卖点[0]) lines.push('· ' + l1Copy.卖点[0]);
  return lines.slice(0, 2);
}

// 内页图说：每张配一个卖点/场景，循环
function buildInnerCaptions(p, dict, l1Copy, count) {
  const pool = [];
  if (l1Copy.卖点) pool.push(...l1Copy.卖点.map(s => '✓ ' + s));
  if (l1Copy.场景) pool.push(...l1Copy.场景.map(s => '适用：' + s));
  if (l1Copy.角度) pool.push(...l1Copy.角度.map(s => s));
  // 尺寸
  if (p.size) pool.push('规格：' + p.size.replace(/×/g, '×'));
  // 不够就循环
  const caps = [];
  for (let i = 0; i < count; i++) caps.push(pool[i % pool.length]);
  return caps;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cat') out.cat = argv[++i];
    if (argv[i] === '--id')  out.id = argv[++i];
  }
  return out;
}
