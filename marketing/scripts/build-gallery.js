/**
 * 把产品数据注入到 gallery.html，生成可浏览的总览页
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { listImagesByProduct } = require('./lib/image-utils');

const products = JSON.parse(fs.readFileSync(config.paths.productsData, 'utf-8'));

// 给每个产品附上它的主图文件名列表
const data = products.map(p => ({
  id: p.id,
  l1: p.l1,
  cat: p.cat,
  title: p.title,
  titleEn: p.titleEn,
  size: p.size,
  imgs: listImagesByProduct(config.paths.sourceImages, p.id)
    .map(fp => path.basename(fp).replace(/\.jpg$/i, '') + '_800.jpg')
    .slice(0, 6),
}));

let html = fs.readFileSync(path.join(config.paths.outputRoot, 'gallery.html'), 'utf-8');
html = html.replace('__PRODUCTS_PLACEHOLDER__', JSON.stringify(data, null, 2));
fs.writeFileSync(path.join(config.paths.outputRoot, 'gallery.html'), html, 'utf-8');

console.log(`总览页已生成：${data.length} 款产品`);
console.log(`打开：${path.join(config.paths.outputRoot, 'gallery.html')}`);
