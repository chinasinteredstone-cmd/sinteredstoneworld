/**
 * 生成阿里巴巴国际站英文标题、关键词、产品描述
 *
 * 阿里标题规则：
 *   - 最多 128 字符
 *   - 结构：核心材质 + 产品品类 + 花色/特征 + 应用场景 + 规格
 *   - 关键词前置（前30字符最影响搜索权重）
 *
 * 输出 CSV（含 BOM，Excel 直接打开不乱码）：
 *   - titles.csv       产品ID, 板块, 品类, 标题, 主关键词, 长尾词×3, 描述
 *
 * 用法：
 *   node generate-titles.js                # 全部
 *   node generate-titles.js --cat Pandora  # 某品类
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const args = parseArgs(process.argv.slice(2));
const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));

let targets = products;
if (args.cat) targets = targets.filter(p => p.cat === args.cat);

// ===== 标题/描述生成逻辑 =====

function buildTitle(p) {
  const dict = config.catalogDict[p.cat] || {};
  const l1 = config.l1Dict[p.l1] || { en: 'Sintered Stone', keyword: 'sintered stone' };
  const size = parseSize(p.size);

  // 按板块定制标题公式
  let title;
  if (p.l1 === 'slab') {
    // 大板：材质 + 花色 + 纹理描述 + Slab + 应用 + 尺寸
    const material = dict.material || 'Sintered Stone';
    const color = dict.color || p.titleEn || p.cat;
    const pattern = (dict.pattern || 'luxury stone texture').replace(/^luxury\s+/i, '');
    title = `${color} ${material} ${pattern} Slab for Wall Floor Countertop ${size}`;
  } else if (p.l1 === 'furniture') {
    // 家具：材质 + 类型 + 花色 + 应用 + 尺寸
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

  // 截断到128字符（阿里限制）
  if (title.length > 128) title = title.slice(0, 125) + '...';
  return title;
}

function buildKeywords(p) {
  const dict = config.catalogDict[p.cat] || {};
  const l1 = config.l1Dict[p.l1] || { keyword: 'sintered stone' };

  // 主关键词（最核心，3-5词，前置）
  let main;
  if (p.l1 === 'slab') {
    main = `${dict.material || 'sintered stone'} ${dict.color || p.cat} slab`.toLowerCase();
  } else if (p.l1 === 'furniture') {
    main = `sintered stone ${dict.type || p.cat}`.toLowerCase().replace(/\s+/g, ' ');
  } else {
    main = l1.keyword;
  }

  // 长尾关键词3个（覆盖不同搜索意图）
  const tails = [];
  if (p.l1 === 'slab') {
    tails.push(`${dict.color || p.cat} ${dict.pattern ? 'stone slab' : 'marble slab'}`.toLowerCase());
    tails.push('luxury sintered stone slab wholesale');
    tails.push(`${dict.color || p.cat} stone for countertop wall`.toLowerCase());
  } else if (p.l1 === 'furniture') {
    tails.push(`${dict.type || p.cat} ${dict.application || 'home'}`.toLowerCase());
    tails.push('luxury stone top table manufacturer');
    tails.push(`${dict.color || 'sintered stone'} dining table`.toLowerCase());
  } else {
    tails.push(l1.keyword);
    tails.push('wholesale foshan china');
    tails.push('factory direct price');
  }

  return { main, tails: tails.slice(0, 3) };
}

function buildDescription(p) {
  const dict = config.catalogDict[p.cat] || {};
  const l1 = config.l1Dict[p.l1] || { en: 'Sintered Stone' };
  const c = config.company;
  const size = parseSize(p.size);

  const lines = [];
  lines.push(`Product: ${p.titleEn || p.title}`);
  lines.push(`Category: ${l1.en}`);
  lines.push(`Color/Pattern: ${dict.color || p.cat}`);
  lines.push(`Size: ${size || 'Custom sizes available'}`);
  lines.push('');
  lines.push('Key Features:');
  lines.push('- Premium sintered stone / luxury natural stone surface');
  lines.push('- Heat resistant, scratch resistant, stain resistant');
  lines.push('- Non-porous, easy to clean, food safe');
  lines.push('- UV resistant, color will not fade');
  lines.push('- Large format available, seamless splicing');
  lines.push('');
  lines.push('Applications:');
  if (p.l1 === 'slab') {
    lines.push('- Kitchen countertop, bathroom vanity, wall cladding');
    lines.push('- Floor tile, feature wall, dining table top');
    lines.push('- Commercial projects, hotel, villa decoration');
  } else if (p.l1 === 'furniture') {
    lines.push('- Living room, dining room, kitchen');
    lines.push('- Villa, hotel, restaurant furniture');
    lines.push('- Residential and commercial projects');
  } else {
    lines.push('- Interior decoration and furniture projects');
  }
  lines.push('');
  lines.push('Why choose us:');
  lines.push(`- ${c.nameEn} - professional sintered stone manufacturer in ${c.location}`);
  lines.push('- 200+ stone colors and patterns in stock');
  lines.push('- Custom size and OEM/ODM supported');
  lines.push(`- MOQ: 1 piece (sample available)`);
  lines.push('- Fast delivery, global shipping');
  lines.push('');
  lines.push('Contact us for quotation:');
  lines.push(`- ${c.contact} (${c.title})`);
  lines.push(`- Email: ${c.email}`);
  lines.push(`- WhatsApp/WeChat: ${c.whatsapp}`);
  lines.push(`- Website: ${c.website}`);

  return lines.join('\n');
}

function parseSize(sizeStr) {
  // "2000×1500mm" → "2000x1500mm"
  return (sizeStr || '').replace(/×/g, 'x').trim();
}

// ===== 生成CSV =====

const rows = [];
rows.push(['产品ID', 'ID', '板块L1', '品类Cat', '中文名', '英文名', '尺寸',
           '阿里标题(EN)', '主关键词', '长尾词1', '长尾词2', '长尾词3', '产品描述(EN)']);

for (const p of targets) {
  const title = buildTitle(p);
  const kw = buildKeywords(p);
  const desc = buildDescription(p);
  rows.push([
    p.id, p.id, p.l1, p.cat, p.title, p.titleEn, p.size,
    title, kw.main, kw.tails[0] || '', kw.tails[1] || '', kw.tails[2] || '', desc,
  ]);
}

// 写CSV（带BOM，Excel直接打开中文不乱码）
const outPath = path.join(config.paths.outputRoot, 'alibaba-titles.csv');
let csv = '\ufeff'; // BOM
for (const row of rows) {
  csv += row.map(cell => {
    const s = String(cell == null ? '' : cell);
    // 含逗号/换行/引号的用双引号包裹，内部引号转义
    if (/[",\n\r"]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',') + '\r\n';
}
fs.writeFileSync(outPath, csv, 'utf-8');

console.log(`生成完成：${targets.length} 款产品`);
console.log(`输出：${outPath}`);
console.log(`\n=== 样例（前3款）===`);
for (const p of targets.slice(0, 3)) {
  console.log(`\n[${p.id}] ${p.title}`);
  console.log(`  标题: ${buildTitle(p)}`);
  const kw = buildKeywords(p);
  console.log(`  主词: ${kw.main}`);
  console.log(`  长尾: ${kw.tails.join(' | ')}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cat') out.cat = argv[++i];
  }
  return out;
}
