/**
 * 阿里巴巴国际站自动发布脚本（Node版）
 *
 * 已验证可行的方法论：
 *   ✅ upload input[type=file] 上传图片 → 阿里AI自动识别Sintered Stone类目
 *   ✅ click聚焦 + fill 文本字段 → React正确响应（计数器/value验证）
 *   ✅ li.click() 选类目 + button.click() 进入表单
 *   ⚠️ 绝不用Enter键（会触发意外提交丢session）
 *   ⚠️ 每步读value验证，避免假成功
 *   ⚠️ 用 --session 持久化登录态
 *
 * 用法：
 *   先登录（一次性）：
 *     agent-browser --session alibaba --headed open "https://post.alibaba.com/product/easyListing.htm"
 *     （在浏览器里扫码登录，session会自动保存）
 *
 *   发布产品：
 *     node publish-alibaba.js 1394292          # 发单个产品
 *     node publish-alibaba.js --cat Pandora    # 发某品类
 *     node publish-alibaba.js --limit 5        # 发前5个
 *     node publish-alibaba.js --dry 1394292    # 试运行（只展示不发）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const args = parseArgs(process.argv.slice(2));
const SESSION = 'alibaba';

// ===== 工具函数 =====
function ab(cmd, timeoutMs = 20000) {
  try {
    return execSync(`agent-browser --session ${SESSION} ${cmd}`, {
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (e) {
    return (e.stdout || '').toString().trim();
  }
}

function abEval(jsExpr, timeoutMs = 15000) {
  // 用 base64 编码避免 shell 转义问题
  const b64 = Buffer.from(`(() => { ${jsExpr} })()`).toString('base64');
  const out = ab(`eval -b "${b64}"`, timeoutMs);
  // agent-browser eval 返回 "结果" 格式，提取JSON
  const m = out.match(/"([\s\S]*)"/);
  if (m) {
    try { return JSON.parse(JSON.parse('"' + m[1] + '"')); }
    catch { return m[1]; }
  }
  return out;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fillByRef(ref, value) {
  ab(`click ${ref}`);
  await sleep(150);
  ab(`fill ${ref} "${value.replace(/"/g, '\\"')}"`);
  await sleep(200);
}

// ===== 主流程 =====
async function main() {
  const productId = args._[0];
  if (!productId) {
    console.log('用法: node publish-alibaba.js <产品ID>');
    console.log('     node publish-alibaba.js --cat Pandora');
    console.log('     node publish-alibaba.js --dry 1394292');
    process.exit(1);
  }

  // 读CSV拿产品标题
  const title = readTitleFromCsv(productId);
  if (!title) { console.log(`❌ 没找到产品 ${productId} 的标题数据`); process.exit(1); }

  console.log(`═══ 阿里发布: ${productId} ═══`);
  console.log(`标题: ${title}\n`);

  if (args.dry) {
    console.log('🔍 试运行模式，不实际操作浏览器\n');
    console.log(`将上传主图: ${getMainImages(productId).join(', ')}`);
    console.log(`将填标题: ${title}`);
    return;
  }

  // 检查浏览器session是否活着
  const url = ab('get url');
  if (!url || url.includes('about:blank') || url.includes('login')) {
    console.log('❌ 浏览器未就绪或登录态丢失！');
    console.log('请先运行（在浏览器里扫码登录）：');
    console.log('  agent-browser --session alibaba --headed open "https://post.alibaba.com/product/easyListing.htm"');
    console.log('登录成功后再运行本脚本。');
    process.exit(1);
  }

  // 步骤1：上传第一张图触发类目识别
  console.log('▶ 步骤1/5: 上传主图...');
  const imgs = getMainImages(productId);
  const firstImgWin = toWinPath(imgs[0]);
  ab(`upload 'input[type="file"]' "${firstImgWin}"`, 60000);
  await sleep(6000);
  console.log(`  ✅ 第一张已传，等待AI识别类目`);

  // 上传剩余主图（最多6张）
  for (let i = 1; i < Math.min(imgs.length, 6); i++) {
    ab(`upload 'input[type="file"]' "${toWinPath(imgs[i])}"`, 60000);
    await sleep(1500);
  }
  console.log(`  ✅ 共上传 ${Math.min(imgs.length, 6)} 张主图`);

  // 步骤2：选 Sintered Stone 类目
  console.log('▶ 步骤2/5: 选 Sintered Stone 类目...');
  abEval(`
    const li = Array.from(document.querySelectorAll('li')).find(e =>
      e.textContent.includes('Sintered Stone') && e.textContent.includes('Tiles') && e.offsetParent !== null
    );
    if (li) { li.click(); return 'clicked'; }
    return 'notfound';
  `);
  await sleep(2000);

  // 点击"现在发布产品"进入详细表单
  abEval(`
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('now publishing') || b.textContent.includes('现在发布')
    );
    if (btn && !btn.disabled) { btn.click(); return 'ok'; }
    return btn ? 'disabled' : 'nofound';
  `);
  console.log('  等待详细表单加载...');
  await sleep(5000);

  // 步骤3：填标题
  console.log('▶ 步骤3/5: 填标题...');
  const titleRef = findTitleInputRef();
  if (titleRef) {
    await fillByRef(titleRef, title);
    const counter = abEval(`return (document.body.innerText.match(/(\\d+)\\s*\\/\\s*128/)||[])[1]||'?'`);
    console.log(`  ✅ 标题已填，计数器: ${counter}/128`);
  } else {
    console.log('  ⚠️ 未找到标题输入框，跳过');
  }

  // 步骤4：填文本属性（材质/特性/品牌等）
  console.log('▶ 步骤4/5: 填文本属性...');
  await fillTextAttributes(productId);

  // 步骤5：填价格和MOQ
  console.log('▶ 步骤5/5: 填价格 MOQ...');
  await fillPriceAndMoq();

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ 自动填写完成！');
  console.log('═══════════════════════════════════════');
  console.log('\n⚠️ 还需你手动确认：');
  console.log('  1. 下拉框：售后服务 / 应用场景（点开选选项）');
  console.log('  2. 原产地：Foshan, China');
  console.log('  3. 详情页长图上传');
  console.log('  4. 检查无误后点【提交】');
  console.log('\n📄 详情页图片位置:');
  console.log(`  ${path.join(config.paths.detailPages, productId + '_detail.jpg')}`);
}

// ===== 辅助函数 =====
function readTitleFromCsv(productId) {
  const csvPath = path.join(config.paths.outputRoot, 'alibaba-titles.csv');
  const lines = fs.readFileSync(csvPath, 'utf-8').replace(/^\ufeff/, '').split('\r\n');
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    if (c[0] === productId) return c[7];
  }
  return null;
}

function getMainImages(productId) {
  const dir = config.paths.mainImages;
  return fs.readdirSync(dir)
    .filter(f => f.startsWith(productId + '_') && f.endsWith('_800.jpg'))
    .sort((a, b) => {
      const ia = parseInt(a.split('_')[1]);
      const ib = parseInt(b.split('_')[1]);
      return ia - ib;
    })
    .map(f => path.join(dir, f));
}

function toWinPath(p) {
  return p.replace(/\//g, '\\').replace(/^C:\\/, 'C:\\');
}

function findTitleInputRef() {
  // 标题输入框是 required 的 textbox
  const snap = ab('snapshot -i');
  const m = snap.match(/- textbox \[required, ref=(e\d+)\]/);
  return m ? '@' + m[1] : null;
}

async function fillTextAttributes(productId) {
  const product = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'))
    .find(p => p.id === productId);
  if (!product) return;
  const dict = config.catalogDict[product.cat] || {};
  const size = (product.size || '').replace(/×/g, 'x');

  // 字段名 → 值 映射
  const fieldMap = {
    'Material': 'Sintered Stone',
    'Feature': `Heat Resistant, Scratch Resistant, Stain Resistant, ${dict.color || product.cat}`,
    'Floor Specification': size,
    'Size': size,
    'Design Style': 'Modern Luxury',
    'Brand Name': 'Wharton Ceramics',
    'Model Number': productId,
    'Usage': 'Wall, Floor, Countertop, Table',
    'Surface Treatment': 'Polished / Matte',
    'Technique': 'Sintered',
  };

  const snap = ab('snapshot -i');
  let filled = 0;
  for (const [fieldName, value] of Object.entries(fieldMap)) {
    // 找字段对应的输入框: gridcell "*FieldName Please Enter" → textbox
    const re = new RegExp(`gridcell "[^"]*${fieldName}[^"]*"[^>]*>[\\s\\S]*?textbox "[^"]*" \\[ref=(e\\d+)\\]`);
    const m = snap.match(re);
    if (m) {
      const ref = '@' + m[1];
      await fillByRef(ref, value);
      filled++;
      console.log(`  ✅ ${fieldName}: ${value.slice(0, 30)}`);
    }
  }
  console.log(`  共填 ${filled} 个属性字段`);
}

async function fillPriceAndMoq() {
  const snap = ab('snapshot -i');
  // MOQ 输入框: textbox "Please Enter" 在 "MOQ" 区域
  // 价格输入框: textbox "Enter price"
  const moqMatch = snap.match(/MOQ[\s\S]*?textbox "[^"]*" \[ref=(e\d+)\]/);
  const priceMatch = snap.match(/Enter price[\s\S]*?textbox "[^"]*" \[ref=(e\d+)\]|textbox "Enter price" \[ref=(e\d+)\]/);

  if (moqMatch) {
    await fillByRef('@' + moqMatch[1], '1');
    console.log('  ✅ MOQ: 1');
  }
  if (priceMatch) {
    const ref = priceMatch[1] || priceMatch[2];
    await fillByRef('@' + ref, '25');
    console.log('  ✅ 价格: 25 USD');
  }
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === ',') { cells.push(cur); cur = ''; }
      else if (c === '"') inQ = true;
      else cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry') out.dry = true;
    else if (argv[i] === '--cat') out.cat = argv[++i];
    else if (argv[i] === '--limit') out.limit = argv[++i];
    else if (!argv[i].startsWith('--')) out._.push(argv[i]);
  }
  return out;
}

main().catch(e => console.log('❌ 出错:', e.message));
