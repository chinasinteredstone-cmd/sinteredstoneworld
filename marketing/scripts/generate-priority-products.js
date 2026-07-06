/**
 * 生成"优先上传产品清单"——基于真实库存Excel
 *
 * 把库存数据的32条 → 按花色合并成10个产品（每花色1个产品，多规格）
 * 每个产品匹配它文件夹里的真实图片
 * 用真实价格（USD/SQM）和真实库存做MOQ参考
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const STOCK_XLSX = 'C:/Users/AppleLo/Documents/WXWork/1688854078803044/WeDrive/沃顿家居/07_库存/沃顿常规库存 20260705.xlsx';
const STOCK_IMG_DIR = 'C:/Users/AppleLo/Documents/WXWork/1688854078803044/WeDrive/沃顿家居/07库存';
const STOCK_IMG_DIR2 = 'C:/Users/AppleLo/Documents/WXWork/1688854078803044/WeDrive/沃顿家居/07_库存';
const OUT_DIR = 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/alibaba/operations';
fs.mkdirSync(OUT_DIR, { recursive: true });

// 花色英文字典（用于阿里标题SEO）
const colorDict = {
  '帝王翡翠绿': { en: 'Imperial Green Jade', keyword: 'emerald green luxury stone', tags: 'emerald, green, jade, luxury' },
  '雕刻鱼肚金': { en: 'Carve Fish Belly Gold', keyword: 'fish belly gold sintered stone', tags: 'gold, fish belly, carve' },
  '镜湖春晓':   { en: 'Ahlambra', keyword: 'ahlambra mirror lake sintered stone', tags: 'ahlambra, mirror, lake' },
  '米白洞石':   { en: 'Travertine 3003', keyword: 'travertine white sintered stone', tags: 'travertine, white, beige' },
  '潘多拉':     { en: 'Pandora', keyword: 'pandora beige sintered stone slab', tags: 'pandora, beige, brown' },
  '莎士比亚黑': { en: 'Shakespeare Black', keyword: 'shakespeare black sintered stone', tags: 'black, shakespeare, matt' },
  '索伦托灰':   { en: 'Sorrento Grigio', keyword: 'sorrento grigio grey sintered stone', tags: 'grey, sorrento, grigio' },
  '土耳其棕':   { en: 'Turkish Brown', keyword: 'turkish brown sintered stone slab', tags: 'brown, turkish, cbb' },
  '意大利浅灰': { en: 'Light Grey', keyword: 'italian light grey sintered stone', tags: 'light grey, italian' },
};

(async () => {
  // 读库存Excel
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(STOCK_XLSX);
  const ws = wb.worksheets[0];

  // 按花色分组
  const byColor = {};
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const getCell = (c) => {
      let v = row.getCell(c).value;
      if (v && typeof v === 'object') {
        if (v.richText) v = v.richText.map(t => t.text).join('');
        else if (v.text) v = v.text;
        else if (v.result !== undefined) v = v.result;
        else v = '';
      }
      return String(v || '').trim();
    };
    const nameCn = getCell(1);
    if (!nameCn) continue;
    // 提取花色中文关键词
    let colorKey = Object.keys(colorDict).find(k => nameCn.includes(k));
    if (!colorKey) continue;

    if (!byColor[colorKey]) byColor[colorKey] = [];
    byColor[colorKey].push({
      size: getCell(6),
      sqmPc: getCell(7),
      qty: getCell(9),
      usdSqm: parseFloat(getCell(12)) || 0,
      variation: getCell(2),
      finishes: getCell(3),
    });
  }

  // 匹配每个花色的图片
  const products = [];
  for (const [colorKey, specs] of Object.entries(byColor)) {
    const dict = colorDict[colorKey];
    // 找对应图片文件夹
    const folders = fs.readdirSync(STOCK_IMG_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.includes(colorKey))
      .map(d => path.join(STOCK_IMG_DIR, d.name));
    let imgs = [];
    for (const f of folders) {
      const files = fs.readdirSync(f).filter(file =>
        /\.(jpg|jpeg|png)$/i.test(file) &&
        !/\.psb/i.test(file) &&
        fs.statSync(path.join(f, file)).size > 10000  // 过滤掉下载未完成的
      );
      imgs.push(...files.map(file => path.join(f, file)));
    }
    // 也从07_库存根目录找
    const rootImgs = fs.readdirSync(STOCK_IMG_DIR2).filter(file =>
      /\.(jpg|jpeg|png)$/i.test(file) && file.includes(colorKey)
    ).map(file => path.join(STOCK_IMG_DIR2, file));
    imgs.push(...rootImgs);

    // 计算价格区间
    const prices = specs.map(s => s.usdSqm).filter(p => p > 0);
    const minPrice = prices.length ? Math.min(...prices).toFixed(2) : '0';
    const maxPrice = prices.length ? Math.max(...prices).toFixed(2) : '0';
    const totalQty = specs.reduce((sum, s) => sum + (parseInt(s.qty) || 0), 0);

    // 取最小规格的平米数算单价（展示用）
    const sampleSpec = specs[0];
    const samplePrice = sampleSpec.usdSqm;

    products.push({
      colorKey,
      nameCn: colorKey,
      nameEn: dict.en,
      keyword: dict.keyword,
      tags: dict.tags,
      specs,  // 所有规格
      sizeList: specs.map(s => s.size).join(' / '),
      priceRange: `${minPrice}~${maxPrice}`,
      samplePrice,
      totalQty,
      imgs,
      imgCount: imgs.length,
    });
  }

  // 按图片数排序（图多的优先传，因为内容更完整）
  products.sort((a, b) => b.imgCount - a.imgCount);

  // 保存JSON
  fs.writeFileSync(path.join(OUT_DIR, '优先上传清单.json'), JSON.stringify(products, null, 2));

  // 输出清单
  console.log('═══════════════════════════════════════════════');
  console.log('  优先上传清单（基于真实库存，共 ' + products.length + ' 个花色）');
  console.log('═══════════════════════════════════════════════\n');
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.nameCn} (${p.nameEn})`);
    console.log(`   规格: ${p.sizeList}`);
    console.log(`   库存: ${p.totalQty}片 | 价格: $${p.priceRange}/SQM`);
    console.log(`   图片: ${p.imgCount}张`);
    if (p.imgs[0]) console.log(`   示例图: ${path.basename(p.imgs[0])}`);
    console.log('');
  });

  console.log(`\n已保存: ${path.join(OUT_DIR, '优先上传清单.json')}`);
})();
