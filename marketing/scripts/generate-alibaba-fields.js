/**
 * 生成阿里国际站【逐产品填表清单】
 *
 * 把每个产品的所有阿里字段值预先算好，生成一个HTML清单页：
 *   - 左侧产品列表（可搜索/筛选）
 *   - 右侧选中产品的所有字段填法（可直接复制）
 *   - 每个字段标注：字段名、值、是否必填、备注
 *
 * 阿里岩板类目字段映射（基于实测）：
 *   商品名称(必填) ← 英文标题
 *   材质(必填) ← Sintered Stone
 *   售后服务(必填,下拉) ← Online support;Return and Replacement
 *   应用场景(必填,下拉) ← 按产品板块
 *   原产地(必填) ← Foshan, China
 *   特性(必填) ← Heat Resistant等
 *   板面规格 ← 尺寸
 *   尺寸 ← 尺寸
 *   品牌 ← Wharton Ceramics
 *   设计风格 ← Modern Luxury
 *   最小起订量(必填) ← 1
 *   单件价格(必填) ← 15-50 区间
 *   ...
 *
 * 输出：marketing/alibaba/fill-guide.html
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));

// ===== 字段生成逻辑 =====

function buildFields(p) {
  const dict = config.catalogDict[p.cat] || {};
  const l1 = config.l1Dict[p.l1] || { en: 'Sintered Stone' };
  const xhsDict = config.xhsDict[p.cat] || config.xhsDict._default;
  const size = (p.size || 'Custom sizes available').replace(/×/g, 'x');

  // 商品名称（英文标题，≤128字符）
  let title;
  const color = dict.color || p.titleEn || p.cat;
  const pattern = (dict.pattern || 'luxury stone texture').replace(/^luxury\s+/i, '');
  if (p.l1 === 'slab') {
    title = `${color} ${dict.material || 'Sintered Stone'} ${pattern} Slab for Wall Floor Countertop ${size}`;
  } else if (p.l1 === 'furniture') {
    title = `${color} ${dict.type || p.cat} Sintered Stone Top for ${dict.application || 'home'} ${size}`;
  } else if (p.l1 === 'accessory') {
    title = `${dict.type || p.cat} Metal Base Legs for Stone Table Furniture ${size}`;
  } else {
    title = `Sintered Stone ${p.cat} Project Case Study Luxury Stone Application`;
  }
  if (title.length > 128) title = title.slice(0, 125) + '...';

  // 应用场景（按板块）
  let scene;
  if (p.l1 === 'slab') scene = 'Home office;Dining;Kitchen;Bathroom;Hotel';
  else if (p.l1 === 'furniture') scene = 'Home office;Dining;Living room;Hotel';
  else if (p.l1 === 'accessory') scene = 'Home office;Dining';
  else scene = 'Hotel;Commercial;Villa';

  // 特性（SEO关键词载体）
  const features = `Heat Resistant, Scratch Resistant, Stain Resistant, UV Resistant, ${color} ${pattern}`;

  return [
    { name: '商品名称 Product Name', value: title, required: true, copy: true, tip: '阿里最重要的搜索字段，关键词前置' },
    { name: '类目 Category', value: '建材与房地产 >> 瓷砖及配件 >> 岩板', required: true, copy: false, tip: '已为你选好，从"您经常使用的类目"里点【岩板】' },
    { name: '材质 Material', value: 'Sintered Stone', required: true, copy: true, tip: '' },
    { name: '售后服务 After-sales', value: 'Online support; Return and Replacement', required: true, copy: true, tip: '下拉多选' },
    { name: '应用场景 Application', value: scene, required: true, copy: true, tip: '下拉多选' },
    { name: '原产地 Origin', value: 'Foshan, China', required: true, copy: true, tip: '' },
    { name: '特性 Feature', value: features, required: true, copy: true, tip: '关键词，影响搜索' },
    { name: '板面规格 Size (mm²)', value: size, required: false, copy: true, tip: '' },
    { name: '尺寸 Dimension', value: size, required: false, copy: true, tip: '' },
    { name: '品牌 Brand', value: 'Wharton Ceramics', required: false, copy: true, tip: '' },
    { name: '设计风格 Style', value: 'Modern Luxury', required: false, copy: true, tip: '' },
    { name: '型号 Model', value: p.id, required: false, copy: true, tip: '用产品ID当型号' },
    { name: '纹理 Texture', value: xhsDict.nick || color, required: false, copy: true, tip: '' },
    { name: '光泽 Gloss', value: 'Matte / Polished', required: false, copy: true, tip: '' },
    { name: '用途 Usage', value: 'Wall, Floor, Countertop, Table', required: false, copy: true, tip: '' },
    { name: '生产工艺 Production', value: 'Sintered', required: false, copy: true, tip: '' },
    { name: '最小起订量 MOQ', value: '1', required: true, copy: true, tip: '你定的MOQ=1' },
    { name: '单件价格 Price (USD)', value: '15 ~ 50', required: true, copy: true, tip: '议价制参考区间' },
    { name: '主图(6张) Main Images', value: `marketing/alibaba/main-images/${p.id}_*_800.jpg`, required: true, copy: false, tip: '从 main-images 文件夹拖这产品的图(最多6张)' },
    { name: '详情页 Detail Page', value: `marketing/alibaba/detail-pages/${p.id}_detail.jpg`, required: false, copy: false, tip: '从 detail-pages 文件夹拖这张长图' },
  ];
}

// ===== 生成数据 =====
const data = products.map(p => ({
  id: p.id,
  title: p.title,
  cat: p.cat,
  l1: p.l1,
  size: p.size,
  fields: buildFields(p),
}));

// ===== 生成HTML =====
const html = buildHtml(data);
const outPath = path.join(config.paths.outputRoot, 'fill-guide.html');
fs.writeFileSync(outPath, html, 'utf-8');

console.log(`✅ 填表清单已生成：${data.length} 款产品`);
console.log(`📂 打开：${outPath}`);

function buildHtml(data) {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>阿里国际站填表清单 - 逐产品字段</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:"Microsoft YaHei",Arial,sans-serif; background:#f0f2f5; color:#1a1a1a; }
  .layout { display:flex; height:100vh; }
  /* 左侧产品列表 */
  .sidebar { width:320px; background:#1a1a1a; color:#fff; overflow-y:auto; flex-shrink:0; }
  .sidebar-head { padding:18px 16px; position:sticky; top:0; background:#1a1a1a; border-bottom:1px solid #333; z-index:2; }
  .sidebar-head h1 { font-size:16px; color:#d4b876; margin-bottom:10px; letter-spacing:1px; }
  .sidebar-head input { width:100%; padding:8px 12px; background:#2a2a2a; border:1px solid #444; color:#fff; border-radius:6px; font-size:13px; }
  .sidebar-head select { width:100%; margin-top:8px; padding:6px; background:#2a2a2a; border:1px solid #444; color:#fff; border-radius:6px; font-size:12px; }
  .product-item { padding:10px 16px; border-bottom:1px solid #222; cursor:pointer; transition:background 0.15s; }
  .product-item:hover { background:#2a2a2a; }
  .product-item.active { background:#3a3020; border-left:3px solid #d4b876; }
  .product-item .pid { font-size:11px; color:#888; }
  .product-item .ptitle { font-size:13px; color:#eee; margin-top:2px; }
  .product-item .pcat { font-size:10px; color:#d4b876; margin-top:2px; }
  /* 右侧字段表 */
  .main { flex:1; overflow-y:auto; padding:24px 32px; }
  .main-head { margin-bottom:20px; padding-bottom:16px; border-bottom:2px solid #d4b876; }
  .main-head .h-id { font-size:12px; color:#888; }
  .main-head h2 { font-size:22px; margin:4px 0; }
  .main-head .h-cat { font-size:13px; color:#b8965a; }
  .main-head .actions { margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; }
  .main-head .actions a { padding:8px 16px; background:#1a1a1a; color:#d4b876; border-radius:6px; text-decoration:none; font-size:12px; }
  .field-list { background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
  .field-row { display:grid; grid-template-columns:200px 1fr 60px; gap:12px; padding:12px 16px; border-bottom:1px solid #f0f0f0; align-items:start; }
  .field-row:last-child { border-bottom:none; }
  .field-row:hover { background:#fafafa; }
  .field-name { font-size:13px; font-weight:600; }
  .field-name .req { color:#e74c3c; margin-left:3px; }
  .field-value { font-size:13px; color:#333; word-break:break-all; background:#f7f7f7; padding:6px 10px; border-radius:4px; min-height:24px; font-family:Consolas,monospace; }
  .field-tip { font-size:11px; color:#999; margin-top:4px; grid-column:2; }
  .copy-btn { padding:4px 10px; background:#d4b876; color:#1a1a1a; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; }
  .copy-btn:hover { background:#b8965a; color:#fff; }
  .copy-btn.copied { background:#27ae60; color:#fff; }
  .empty { text-align:center; padding:60px; color:#999; }
  /* SOP折叠 */
  .sop { background:#fff; border-radius:8px; padding:16px 20px; margin-top:20px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
  .sop h3 { color:#b8965a; margin-bottom:10px; font-size:15px; }
  .sop ol { padding-left:20px; line-height:1.9; font-size:13px; }
  .sop li { margin-bottom:4px; }
  .sop .note { background:#fff8e6; padding:8px 12px; border-radius:4px; font-size:12px; color:#8b6914; margin-top:8px; }
</style>
</head>
<body>
<div class="layout">
  <div class="sidebar">
    <div class="sidebar-head">
      <h1>📋 阿里填表清单</h1>
      <input type="text" id="search" placeholder="🔍 搜索产品名/ID..." oninput="renderList()">
      <select id="filterCat" onchange="renderList()">
        <option value="">全部品类</option>
      </select>
    </div>
    <div id="productList"></div>
  </div>
  <div class="main" id="main">
    <div class="empty">← 点击左侧产品查看字段填法</div>
  </div>
</div>

<script>
const DATA = ${JSON.stringify(data)};

const l1Names = { slab:'奢石大板', furniture:'成品家具', accessory:'配件脚架', case:'落地案例' };
const cats = [...new Set(DATA.map(p=>p.cat))].sort();
const catSel = document.getElementById('filterCat');
cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;catSel.appendChild(o);});

let currentId = null;

function renderList(){
  const q=document.getElementById('search').value.toLowerCase();
  const cat=document.getElementById('filterCat').value;
  const filtered=DATA.filter(p=>{
    const okQ=!q||(p.title+' '+p.id+' '+p.cat).toLowerCase().includes(q);
    const okC=!cat||p.cat===cat;
    return okQ&&okC;
  });
  const list=document.getElementById('productList');
  list.innerHTML=filtered.map(p=>'<div class="product-item'+(p.id===currentId?' active':'')+'" onclick="selectProduct(\''+p.id+'\')">'+
    '<div class="pid">#'+p.id+'</div>'+
    '<div class="ptitle">'+esc(p.title)+'</div>'+
    '<div class="pcat">'+(l1Names[p.l1]||p.l1)+' · '+esc(p.cat)+'</div>'+
    '</div>').join('');
  if(!filtered.length) list.innerHTML='<div style="padding:20px;color:#666;text-align:center">无匹配产品</div>';
}

function selectProduct(id){
  currentId=id;
  const p=DATA.find(x=>x.id===id);
  const main=document.getElementById('main');
  const rows=p.fields.map((f,i)=>'<div class="field-row">'+
    '<div class="field-name">'+esc(f.name)+(f.required?'<span class="req">*</span>':'')+'</div>'+
    '<div class="field-value" id="fv'+i+'">'+esc(f.value)+'</div>'+
    (f.copy?'<button class="copy-btn" onclick="copyVal('+i+',this)">复制</button>':'<div></div>')+
    (f.tip?'<div class="field-tip">'+esc(f.tip)+'</div>':'')+
    '</div>').join('');

  main.innerHTML='<div class="main-head">'+
    '<div class="h-id">产品ID: '+p.id+' | '+(l1Names[p.l1]||p.l1)+'</div>'+
    '<h2>'+esc(p.title)+'</h2>'+
    '<div class="h-cat">'+esc(p.cat)+' · '+esc(p.size)+'</div>'+
    '<div class="actions">'+
      '<a href="main-images/" target="_blank">📁 打开主图文件夹</a>'+
      '<a href="detail-pages/'+p.id+'_detail.jpg" target="_blank">📄 查看详情页</a>'+
    '</div></div>'+
    '<div class="field-list">'+rows+'</div>'+
    '<div class="sop">'+
      '<h3>📝 这个产品的发布步骤</h3>'+
      '<ol>'+
        '<li>在阿里发布页选【岩板】类目，进入详细表单</li>'+
        '<li>把上面<b>商品名称</b>复制粘贴到标题框（最关键，影响搜索）</li>'+
        '<li>从主图文件夹拖 6 张 800×800 主图到图片区</li>'+
        '<li>依次填<b>材质/售后服务/应用场景/原产地/特性</b>（带*必填）</li>'+
        '<li>填<b>最小起订量=1</b>，<b>价格=15~50</b></li>'+
        '<li>详情页用 generated 的长图（detail-pages/'+p.id+'_detail.jpg）</li>'+
        '<li>检查无误后提交</li>'+
      '</ol>'+
      '<div class="note">💡 提示：售后/应用/质保是下拉多选，点开选对应选项；其他直接复制粘贴</div>'+
    '</div>';
  renderList();
  document.querySelector('.main').scrollTop=0;
}

function copyVal(i,btn){
  const el=document.getElementById('fv'+i);
  navigator.clipboard.writeText(el.textContent).then(()=>{
    btn.textContent='已复制✓';btn.classList.add('copied');
    setTimeout(()=>{btn.textContent='复制';btn.classList.remove('copied');},1500);
  });
}

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

renderList();
</script>
</body>
</html>`;
}
