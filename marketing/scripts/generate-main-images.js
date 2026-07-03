/**
 * 生成阿里巴巴国际站主图（800x800，白底）
 *
 * 用法：
 *   node generate-main-images.js                # 生成全部200款
 *   node generate-main-images.js --cat Pandora  # 只生成某个品类
 *   node generate-main-images.js --id 1394292   # 只生成某个产品ID
 *
 * 输出：marketing/alibaba/main-images/{productId}_{idx}_800.jpg
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { fitIntoSquare, listImagesByProduct } = require('./lib/image-utils');

const args = parseArgs(process.argv.slice(2));
const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));

// 过滤要处理的产品
let targets = products;
if (args.cat) targets = targets.filter(p => p.cat === args.cat);
if (args.id)  targets = targets.filter(p => p.id === args.id);

const outDir = config.paths.mainImages;
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  console.log(`开始生成主图：共 ${targets.length} 款产品`);
  console.log(`输出目录：${outDir}\n`);

  let totalImgs = 0, okCount = 0, failCount = 0;
  const failed = [];

  for (const p of targets) {
    const imgs = listImagesByProduct(config.paths.sourceImages, p.id);
    if (imgs.length === 0) {
      console.log(`  ⚠️  [${p.id}] ${p.title} —— 没找到图片，跳过`);
      failed.push(p);
      continue;
    }

    // 阿里主图最多6张，取前6
    const mainImgs = imgs.slice(0, 6);
    for (let i = 0; i < mainImgs.length; i++) {
      const src = mainImgs[i];
      const outName = `${p.id}_${i}_800.jpg`;
      const outPath = path.join(outDir, outName);
      try {
        await fitIntoSquare(src, outPath, 800, {
          background: '#ffffff',
          quality: 92,
        });
        okCount++;
        totalImgs++;
      } catch (e) {
        failCount++;
        failed.push({ ...p, img: src, error: e.message });
        console.log(`  ❌ [${p.id}] ${path.basename(src)} 失败：${e.message}`);
      }
    }
    process.stdout.write(`  ✅ [${p.id}] ${p.title} → ${mainImgs.length} 张主图\n`);
  }

  console.log(`\n========== 完成 ==========`);
  console.log(`产品：${targets.length} 款`);
  console.log(`成功生成主图：${totalImgs} 张`);
  console.log(`失败：${failCount} 张`);
  if (failed.length) {
    console.log(`\n失败清单：`);
    failed.forEach(f => console.log(`  - ${f.id} ${f.title} ${f.img || ''} ${f.error || ''}`));
  }
})();

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cat') out.cat = argv[++i];
    if (argv[i] === '--id')  out.id = argv[++i];
  }
  return out;
}
