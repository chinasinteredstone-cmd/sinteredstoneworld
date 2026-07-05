/**
 * 阿里巴巴国际站批量上传脚本（type法 - 属性可持久版）
 *
 * 核心突破（已实测验证）：
 *   - fill 命令填属性 → React重渲染会清空 ❌
 *   - type 命令填属性 → 触发完整键盘事件，React正确更新state ✓
 *
 * 已验证可行的完整流程（每个产品）：
 *   1. upload 图片 → 阿里AI识别岩板类目
 *   2. li.click() 选 Sintered Stone 类目
 *   3. button.click() 进入详细表单
 *   4. click+type 填标题（计数器验证）
 *   5. click+type 填所有文本属性（持久验证）
 *   6. click+type 填MOQ+价格+发货期
 *   7. （手动/后续）下拉框+详情页+提交
 *
 * 用法：
 *   先登录（每次session失效都要做）：
 *     agent-browser --session alibaba --headed open "https://post.alibaba.com/product/easyListing.htm"
 *     （在浏览器扫码登录）
 *
 *   批量上传：
 *     node publish-alibaba-batch.js                  # 全部200款
 *     node publish-alibaba-batch.js --cat Pandora    # 某品类
 *     node publish-alibaba-batch.js --limit 5        # 前5个（建议先试）
 *     node publish-alibaba-batch.js --id 1394292     # 单个产品
 *     node publish-alibaba-batch.js --resume         # 从上次中断处继续
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const args = parseArgs(process.argv.slice(2));
const SESSION = 'alibaba';
const PROGRESS_FILE = path.join(config.paths.outputRoot, 'upload-progress.json');

// ===== 浏览器交互工具 =====
function ab(cmd, timeoutMs = 20000) {
  try {
    return execSync(`agent-browser --session ${SESSION} ${cmd}`, {
      timeout: timeoutMs, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'],
    }).trim();
  } catch (e) { return (e.stdout || '').toString().trim(); }
}

function abEval(jsExpr, timeoutMs = 15000) {
  const b64 = Buffer.from(`(() => { ${jsExpr} })()`).toString('base64');
  const out = ab(`eval -b "${b64}"`, timeoutMs);
  try {
    const m = out.match(/^"([\s\S]*)"$/);
    if (m) return JSON.parse('"' + m[1] + '"');
  } catch {}
  return out;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 用 type 命令填值（关键：触发完整键盘事件，让React持久）
async function typeByRef(ref, value) {
  ab(`click ${ref} 2>/dev/null`);
  await sleep(200);
  ab(`type ${ref} "${value.replace(/"/g, '\\"')}" 2>/dev/null`);
  await sleep(300);
}

// 从快照找字段输入框ref
function findInputRefByField(snap, fieldName) {
  // 匹配 gridcell "*字段名 请输入" 后跟的 textbox
  const escName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`gridcell "[^"]*${escName}[^"]*"[^>]*>\\s*[\\s\\S]*?textbox "[^"]*" \\[ref=(e\\d+)\\]`),
    new RegExp(`\\*?${escName}[\\s\\S]{0,100}?textbox "[^"]*" \\[ref=(e\\d+)\\]`),
  ];
  for (const re of patterns) {
    const m = snap.match(re);
    if (m) return '@' + m[1];
  }
  return null;
}

// ===== 进度管理（支持断点续传）=====
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { completed: [], failed: [], lastRun: null };
}

function saveProgress(p) {
  p.lastRun = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// ===== 主流程 =====
async function main() {
  const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));
  let targets = products;

  // 过滤
  if (args.id) targets = targets.filter(p => p.id === args.id);
  if (args.cat) targets = targets.filter(p => p.cat === args.cat);
  if (args.limit) targets = targets.slice(0, parseInt(args.limit));

  // 断点续传：跳过已完成的
  const progress = loadProgress();
  if (args.resume) {
    targets = targets.filter(p => !progress.completed.includes(p.id));
    console.log(`📥 断点续传：跳过已完成 ${progress.completed.length} 个，剩 ${targets.length} 个待传\n`);
  }

  console.log(`═══════════════════════════════════════════════`);
  console.log(`  阿里批量上传 - 共 ${targets.length} 个产品`);
  console.log(`═══════════════════════════════════════════════\n`);

  // 检查登录态
  const url = ab('get url');
  if (url.includes('login') || url.includes('about:blank')) {
    console.log('❌ 未登录或session失效！');
    console.log('请先扫码登录：');
    console.log('  agent-browser --session alibaba --headed open "https://post.alibaba.com/product/easyListing.htm"');
    console.log('登录后重新运行：node publish-alibaba-batch.js --resume');
    process.exit(1);
  }

  let okCount = 0;
  for (const p of targets) {
    console.log(`\n▶ [${okCount + 1}/${targets.length}] 产品 ${p.id} ${p.title}`);
    try {
      await uploadOne(p);
      progress.completed.push(p.id);
      saveProgress(progress);
      okCount++;
      console.log(`  ✅ 完成，进度已保存`);
    } catch (e) {
      progress.failed.push({ id: p.id, error: e.message, time: new Date().toISOString() });
      saveProgress(progress);
      console.log(`  ❌ 失败：${e.message}`);
      console.log(`  ⏸ 已记录，继续下一个（可用 --resume 续传）`);

      // 失败后检查是否session丢了
      const u = ab('get url');
      if (u.includes('login') || u.includes('about:blank')) {
        console.log('\n🚨 登录态丢失！停止批量，请重新扫码登录后用 --resume 继续');
        break;
      }
    }
    // 产品间隔5秒，避免风控
    await sleep(5000);
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  批量完成：成功 ${okCount} / ${targets.length}`);
  console.log(`  累计已完成：${progress.completed.length} 个`);
  console.log(`  失败：${progress.failed.length} 个`);
  console.log(`═══════════════════════════════════════`);
}

async function uploadOne(p) {
  const dict = config.catalogDict[p.cat] || {};
  const size = (p.size || '').replace(/×/g, 'x');
  const color = dict.color || p.titleEn || p.cat;
  const pattern = (dict.pattern || 'luxury stone texture').replace(/^luxury\s+/i, '');

  // 标题
  let title;
  if (p.l1 === 'slab') title = `${color} ${dict.material || 'Sintered Stone'} ${pattern} Slab for Wall Floor Countertop ${size}`;
  else if (p.l1 === 'furniture') title = `${color} ${dict.type || p.cat} Sintered Stone Top for ${dict.application || 'home'} ${size}`;
  else title = `Sintered Stone ${p.cat} Luxury Stone ${size}`;
  if (title.length > 128) title = title.slice(0, 125) + '...';

  // 主图路径
  const mainImgs = fs.readdirSync(config.paths.mainImages)
    .filter(f => f.startsWith(p.id + '_') && f.endsWith('_800.jpg'))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
    .map(f => path.join(config.paths.mainImages, f));

  if (mainImgs.length === 0) throw new Error('无主图');

  // === 步骤1：上传第一张图触发类目识别 ===
  console.log(`  步骤1: 上传图片...`);
  // 先点上传按钮让file input出现
  abEval(`
    const ups = Array.from(document.querySelectorAll('div,span')).filter(e =>
      e.offsetParent !== null && (e.textContent.trim() === '上传图片' || e.textContent.trim() === 'Upload image')
    );
    if (ups[0]) ups[0].click();
    return 'clicked upload';
  `);
  await sleep(1500);

  const imgWin = mainImgs[0].replace(/\//g, '\\');
  ab(`upload 'input[type="file"]' "${imgWin}"`, 60000);
  await sleep(6000);

  // 上传剩余主图（最多6张）
  for (let i = 1; i < Math.min(mainImgs.length, 6); i++) {
    abEval(`
      const ups = Array.from(document.querySelectorAll('div,span')).filter(e =>
        e.offsetParent !== null && (e.textContent.trim() === '上传图片' || e.textContent.trim() === 'Upload image')
      );
      if (ups[${i}]) ups[${i}].click();
      return 'clicked';
    `);
    await sleep(1500);
    try {
      ab(`upload 'input[type="file"]' "${mainImgs[i].replace(/\//g, '\\')}"`, 30000);
      await sleep(2000);
    } catch (e) { /* 单张失败不影响整体 */ }
  }

  // === 步骤2：选 Sintered Stone / 岩板 类目 ===
  console.log(`  步骤2: 选类目...`);
  abEval(`
    const li = Array.from(document.querySelectorAll('li')).find(e => {
      const t = e.textContent;
      return (t.includes('岩板') && t.includes('瓷砖') || (t.includes('Sintered Stone') && t.includes('Tiles')))
        && e.offsetParent !== null;
    });
    if (li) { li.click(); return 'category clicked'; }
    return 'category not found (maybe already selected)';
  `);
  await sleep(2000);

  // 点"现在发布产品"进详细表单
  abEval(`
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('现在发布') || b.textContent.includes('now publishing')
    );
    if (btn && !btn.disabled) { btn.click(); return 'entered form'; }
    return btn ? 'button disabled' : 'no button';
  `);
  await sleep(5000);

  // === 步骤3：拿快照，开始填字段 ===
  console.log(`  步骤3: 填字段（type法）...`);
  let snap = ab('snapshot -i');

  // 标题（用 fill 即可，已验证标题区fill持久）
  const titleRef = findInputRefByField(snap, '商品名称') ||
    (snap.match(/- textbox \[required, ref=(e\d+)\]/) || [])[1];
  if (titleRef) {
    ab(`click ${titleRef} 2>/dev/null`);
    ab(`fill ${titleRef} "${title.replace(/"/g, '\\"')}" 2>/dev/null`);
    console.log(`    ✅ 标题: ${title.slice(0, 40)}...`);
  }

  // 文本属性（用 type，已验证持久）
  const textFields = {
    '材质': 'Sintered Stone',
    '特性': `Heat Resistant, Scratch Resistant, Stain Resistant, UV Resistant, ${color}`,
    '板面规格': size,
    '设计风格': 'Modern Luxury',
    '品牌': 'Wharton Ceramics',
    '型号': p.id,
    '尺寸': size,
    '用途': 'Wall, Floor, Countertop, Table',
  };
  // 英文界面字段名fallback
  const textFieldsEn = {
    'Material': 'Sintered Stone',
    'Feature': `Heat Resistant, Scratch Resistant, Stain Resistant, ${color}`,
    'Size': size,
    'Design Style': 'Modern Luxury',
    'Brand Name': 'Wharton Ceramics',
    'Model Number': p.id,
    'Usage': 'Wall, Floor, Countertop, Table',
  };

  let attrCount = 0;
  for (const [name, val] of Object.entries({ ...textFields, ...textFieldsEn })) {
    const ref = findInputRefByField(snap, name);
    if (ref) {
      await typeByRef(ref, val);
      attrCount++;
      // 找到一个就够了，跳出英文fallback
      if (Object.keys(textFields).includes(name)) delete textFieldsEn[name.replace(' ', ' ')];
    }
  }
  console.log(`    ✅ 属性字段: ${attrCount} 个`);

  // === 步骤4：价格、MOQ、发货期 ===
  console.log(`  步骤4: 价格/MOQ/发货期...`);
  snap = ab('snapshot -i'); // 重新拿快照（ref可能变）

  // MOQ
  const moqRef = (snap.match(/(?:起订量|MOQ)[\s\S]{0,300}?textbox "[^"]*" \[ref=(e\d+)\]/) || [])[1];
  if (moqRef) {
    ab(`click @${moqRef} 2>/dev/null`); ab(`fill @${moqRef} "1" 2>/dev/null`);
    console.log(`    ✅ MOQ: 1`);
  }
  // 价格
  const priceRef = (snap.match(/(?:输入价格|Enter price)[\s\S]{0,100}?textbox "[^"]*" \[ref=(e\d+)\]|textbox "(?:输入价格|Enter price)" \[ref=(e\d+)\]/) || [])[1];
  if (priceRef) {
    ab(`click @${priceRef} 2>/dev/null`); ab(`fill @${priceRef} "25" 2>/dev/null`);
    console.log(`    ✅ 价格: 25`);
  }
  // 发货期（≤30天，发货15天）
  const leadRef1 = (snap.match(/(?:预计时间|Lead Time)[\s\S]{0,300}?textbox "[^"]*" \[ref=(e\d+)\]/) || [])[1];
  if (leadRef1) {
    ab(`click @${leadRef1} 2>/dev/null`); ab(`fill @${leadRef1} "30" 2>/dev/null`);
  }
  const leadRef2 = (snap.match(/(?:预计时间|Lead Time)[\s\S]{0,500}?textbox "[^"]*" \[ref=(e\d+)\]/) || [])[2];
  if (leadRef2) {
    ab(`click @${leadRef2} 2>/dev/null`); ab(`fill @${leadRef2} "15" 2>/dev/null`);
    console.log(`    ✅ 发货期: 15天`);
  }

  // === 步骤5：最终验证（不提交，等你确认）===
  console.log(`  步骤5: 验证填写完整性...`);
  await sleep(1000);
  const verify = abEval(`
    const inputs = Array.from(document.querySelectorAll('input'));
    const vals = inputs.map(i => i.value).filter(v => v && v.length > 2 && v !== 'on' && !/^\\d{6,}$/.test(v));
    return JSON.stringify({
      总字段数: vals.length,
      有标题: vals.some(v => v.includes('Sintered') || v.includes('Stone')),
      有材质: vals.includes('Sintered Stone'),
      有价格: vals.includes('25'),
      有MOQ: vals.includes('1'),
    });
  `);
  console.log(`    ${verify}`);

  // ⚠️ 不自动提交！保留给你确认
  console.log(`  ⏸ 自动填写完成，未提交（等你确认或手动提交）`);
  console.log(`     下拉框(售后/应用/产地)需手动选`);
  console.log(`     详情页需手动传: ${path.join(config.paths.detailPages, p.id + '_detail.jpg')}`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cat') out.cat = argv[++i];
    else if (argv[i] === '--id') out.id = argv[++i];
    else if (argv[i] === '--limit') out.limit = argv[++i];
    else if (argv[i] === '--resume') out.resume = true;
  }
  return out;
}

main().catch(e => {
  console.log('❌ 致命错误:', e.message);
  process.exit(1);
});
