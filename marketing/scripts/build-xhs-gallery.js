/**
 * 注入产品数据到小红书 gallery.html
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { listImagesByProduct } = require('./lib/image-utils');

const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));
const xhsRoot = path.join(path.dirname(config.paths.outputRoot), 'xiaohongshu');

// 读文案CSV（拿到小红书标题）
const csvPath = path.join(xhsRoot, 'xhs-copy.csv');
let xhsTitles = {};
if (fs.existsSync(csvPath)) {
  const lines = fs.readFileSync(csvPath, 'utf-8').replace(/^\ufeff/, '').split('\r\n').filter(Boolean);
  // 第1行表头，第2列开始；标题在第6列（产品ID,中文名,板块,品类,尺寸,小红书标题,...）
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells[0]) xhsTitles[cells[0]] = cells[5] || cells[1];
  }
}

const data = products.map(p => {
  const imgs = listImagesByProduct(config.paths.sourceImages, p.id);
  const imgFiles = [];
  imgFiles.push('cover.jpg');
  // 内页 2.jpg 3.jpg ...
  for (let i = 1; i < imgs.length && i <= config.xiaohongshu.inner.maxCount; i++) {
    imgFiles.push(`${i + 1}.jpg`);
  }
  return {
    id: p.id,
    l1: p.l1,
    cat: p.cat,
    title: p.title,
    titleEn: p.titleEn,
    size: p.size,
    xhsTitle: xhsTitles[p.id] || p.title,
    imgs: imgFiles,
  };
});

let html = fs.readFileSync(path.join(xhsRoot, 'gallery.html'), 'utf-8');
html = html.replace('__PRODUCTS_PLACEHOLDER__', JSON.stringify(data, null, 2));
fs.writeFileSync(path.join(xhsRoot, 'gallery.html'), html, 'utf-8');

console.log(`小红书总览页已生成：${data.length} 款产品`);

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
