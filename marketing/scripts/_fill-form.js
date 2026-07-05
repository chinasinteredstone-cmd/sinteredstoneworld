/**
 * 临时填表脚本 - 给当前打开的阿里表单填入潘多拉1394292的字段
 * 在浏览器session=alibaba中执行
 */
const { execSync } = require('child_process');
const SESS = 'alibaba';

function ab(cmd, t=15000) {
  try { return execSync(`agent-browser --session ${SESS} ${cmd}`, {timeout:t, encoding:'utf-8', stdio:['pipe','pipe','pipe']}).trim(); }
  catch(e) { return (e.stdout||'').toString().trim(); }
}

function abEval(js, t=15000) {
  const b64 = Buffer.from(`(() => { ${js} })()`).toString('base64');
  const out = ab(`eval -b "${b64}"`, t);
  try {
    const m = out.match(/^"([\s\S]*)"$/);
    if (m) return JSON.parse('"' + m[1] + '"');
  } catch {}
  return out;
}

function fill(ref, val) {
  ab(`click ${ref} 2>/dev/null`);
  const b64val = Buffer.from(val).toString('base64');
  // 用 eval + document.execCommand 模拟真实输入，触发 React onChange
  abEval(`
    const inp = document.querySelector('${ref.replace('@','.')}' === '.' ? 'input' : 'input:focus, input');
    return 'focused';
  `);
  // 直接用 fill 命令（已验证可行）
  ab(`fill ${ref} "${val.replace(/"/g,'\\"').replace(/\$/g,'\\$')}"`);
}

// 拿到当前快照
const snap = ab('snapshot -i');
console.log('快照长度:', snap.length);

// 找标题输入框
const titleMatch = snap.match(/- textbox \[required, ref=(e\d+)\]/);
const titleRef = titleMatch ? '@' + titleMatch[1] : null;
console.log('标题输入框:', titleRef);

const TITLE = "Pandora Beige Sintered Stone Slab for Wall Floor Countertop 1636x2181mm Luxury Texture";

// 填标题
if (titleRef) {
  ab(`click ${titleRef}`);
  ab(`fill ${titleRef} "${TITLE.replace(/"/g,'\\"')}"`);
  const cnt = abEval(`return (document.body.innerText.match(/(\\d+)\\s*\\/\\s*128/)||[])[1]||'?'`);
  console.log(`✅ 标题已填，计数器: ${cnt}/128`);
}

// 填文本属性字段 - 通过字段名定位输入框
function findFieldInput(fieldName) {
  // 在快照里找: gridcell "*字段名 ..." 后面跟的 textbox ref
  const re = new RegExp(`gridcell "[^"]*${fieldName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}[^"]*"[^\\n]*\\n\\s*- textbox "[^"]*" \\[ref=(e\\d+)\\]`);
  const m = snap.match(re);
  return m ? '@' + m[1] : null;
}

const fields = {
  '材质': 'Sintered Stone',
  '特性': 'Heat Resistant, Scratch Resistant, Stain Resistant, UV Resistant, Pandora Texture',
  '板面规格': '1636x2181mm',
  '设计风格': 'Modern Luxury',
  '品牌': 'Wharton Ceramics',
  '型号': '1394292',
  '尺寸': '1636x2181mm',
  '用途': 'Wall, Floor, Countertop, Table',
};

let filled = 0;
for (const [name, val] of Object.entries(fields)) {
  const ref = findFieldInput(name);
  if (ref) {
    ab(`click ${ref} 2>/dev/null`);
    ab(`fill ${ref} "${val.replace(/"/g,'\\"')}" 2>/dev/null`);
    filled++;
    console.log(`  ✅ ${name}: ${val.slice(0,40)}`);
  } else {
    console.log(`  ⚠️ ${name}: 未找到输入框`);
  }
}
console.log(`共填 ${filled} 个属性字段`);

// 填MOQ和价格
const moqMatch = snap.match(/起订量[\s\S]{0,200}?textbox "[^"]*" \[ref=(e\d+)\]|MOQ[\s\S]{0,200}?textbox "[^"]*" \[ref=(e\d+)\]/);
const priceMatch = snap.match(/价格[\s\S]{0,300}?textbox "[^"]*" \[ref=(e\d+)\]|price[\s\S]{0,300}?textbox "[^"]*" \[ref=(e\d+)\]/i);

if (moqMatch) {
  const ref = '@' + (moqMatch[1] || moqMatch[2]);
  ab(`click ${ref} 2>/dev/null`);
  ab(`fill ${ref} "1" 2>/dev/null`);
  console.log('  ✅ MOQ: 1');
}
if (priceMatch) {
  const ref = '@' + (priceMatch[1] || priceMatch[2]);
  ab(`click ${ref} 2>/dev/null`);
  ab(`fill ${ref} "25" 2>/dev/null`);
  console.log('  ✅ 价格: 25');
}

// 最终验证
const allVals = abEval(`
  const inputs = Array.from(document.querySelectorAll('input'));
  const vals = inputs.map(i => i.value).filter(v => v && v.length > 2 && !['on'].includes(v));
  return JSON.stringify(vals);
`);
console.log('\n=== 最终验证 - 所有填入的值 ===');
console.log(allVals);
