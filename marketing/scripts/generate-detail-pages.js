/**
 * 生成阿里巴巴国际站详情页长图（750px 宽）
 *
 * 详情页结构（从上到下）：
 *   1. 品牌头图（深色金边 + 产品标题）
 *   2. 产品主图（多张产品图）
 *   3. 产品规格表
 *   4. 产品特性卖点
 *   5. 应用场景
 *   6. 公司实力 + 联系方式
 *
 * 用法：
 *   node generate-detail-pages.js                # 全部
 *   node generate-detail-pages.js --cat Pandora  # 某品类
 *   node generate-detail-pages.js --id 1394292   # 某产品
 *
 * 输出：marketing/alibaba/detail-pages/{productId}_detail.jpg
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('./config');
const { listImagesByProduct } = require('./lib/image-utils');
const blocks = require('./lib/svg-blocks');
const { buildTitle } = (() => {
  // 复用 generate-titles 里的标题逻辑
  const src = fs.readFileSync(path.join(__dirname, 'generate-titles.js'), 'utf-8');
  const match = src.match(/function buildTitle[\s\S]*?^}/m);
  const dictMatch = src.match(/const config = require[\s\S]*?return out;\n\}/);
  // 直接 require 会执行整个文件，这里独立实现一份轻量版
  return {
    buildTitle: (p) => {
      const dict = config.catalogDict[p.cat] || {};
      const l1 = config.l1Dict[p.l1] || { en: 'Sintered Stone' };
      const size = (p.size || '').replace(/×/g, 'x').trim();
      let title;
      if (p.l1 === 'slab') {
        const material = dict.material || 'Sintered Stone';
        const color = dict.color || p.titleEn || p.cat;
        const pattern = (dict.pattern || 'luxury stone texture').replace(/^luxury\s+/i, '');
        title = `${color} ${material} ${pattern} Slab for Wall Floor Countertop ${size}`;
      } else if (p.l1 === 'furniture') {
        const type = dict.type || p.cat;
        const color = dict.color || 'Luxury Stone';
        const application = dict.application || 'home';
        title = `${color} ${type} Sintered Stone Top for ${application} ${size}`;
      } else if (p.l1 === 'accessory') {
        const type = dict.type || p.cat;
        title = `${type} Metal Base Legs for Stone Table Furniture ${size}`;
      } else if (p.l1 === 'case') {
        title = `Sintered Stone ${p.cat} Project Case Study Luxury Stone Application`;
      } else {
        title = `${p.cat} ${l1.en} ${size}`;
      }
      return title.length > 128 ? title.slice(0, 125) + '...' : title;
    },
  };
})();

const args = parseArgs(process.argv.slice(2));
const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));

let targets = products;
if (args.cat) targets = targets.filter(p => p.cat === args.cat);
if (args.id)  targets = targets.filter(p => p.id === args.id);

const outDir = config.paths.detailPages;
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  console.log(`开始生成详情页：共 ${targets.length} 款产品\n`);

  let okCount = 0;
  const failed = [];

  for (const p of targets) {
    try {
      await generateOne(p);
      okCount++;
      console.log(`  ✅ [${p.id}] ${p.title}`);
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
  const title = buildTitle(p);
  const imgs = listImagesByProduct(config.paths.sourceImages, p.id);
  if (imgs.length === 0) throw new Error('没有找到产品图片');

  // 取最多4张产品图（详情页不宜太长）
  const productImgs = imgs.slice(0, 4);

  // 构建详情页各模块的 buffer 列表（都是 750 宽）
  const parts = [];

  // 1. 品牌头
  parts.push(await sharp(blocks.blockHeader(p, title)).png().toBuffer());
  // 2. 产品图（每张）
  for (const img of productImgs) {
    parts.push(await blocks.blockImage(img));
  }
  // 3. 规格表
  parts.push(await sharp(blocks.blockSpec(p)).png().toBuffer());
  // 4. 特性卖点
  parts.push(await sharp(blocks.blockFeatures()).png().toBuffer());
  // 5. 应用场景
  parts.push(await sharp(blocks.blockApplications(p)).png().toBuffer());
  // 6. 公司信息
  parts.push(await sharp(blocks.blockCompany()).png().toBuffer());

  // 纵向拼接
  const metas = [];
  for (const b of parts) metas.push(await sharp(b).metadata());
  const totalH = metas.reduce((s, m) => s + m.height, 0);

  const composites = [];
  let top = 0;
  for (let i = 0; i < parts.length; i++) {
    composites.push({ input: parts[i], top, left: 0 });
    top += metas[i].height;
  }

  const outPath = path.join(outDir, `${p.id}_detail.jpg`);
  await sharp({
    create: { width: blocks.W, height: totalH, channels: 3, background: '#ffffff' },
  })
    .composite(composites)
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outPath);

  return outPath;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cat') out.cat = argv[++i];
    if (argv[i] === '--id')  out.id = argv[++i];
  }
  return out;
}
