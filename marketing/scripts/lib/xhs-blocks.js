/**
 * 小红书封面/内页 SVG 模块生成器
 * 尺寸 1242×1656 (3:4)
 * 中文字体优先级：思源黑体 > 微软雅黑 > 黑体
 *
 * 封面设计：产品大图（顶部65%）+ 渐变遮罩 + 中文大标题（底部35%金条）
 * 内页设计：产品图全屏 + 底部小字说明
 */

const config = require('../config');
const { escapeXml } = require('./image-utils');

const W = 1242, H = 1656;
const GOLD = config.brand.primaryColor;        // #b8965a
const GOLD_LIGHT = config.brand.primaryColorLight; // #d4b876
const DARK = config.brand.darkColor;           // #1a1a1a
// 中文字体栈：思源黑体 > 微软雅黑 > 黑体（sharp 在 Windows 上会用系统字体）
const CN_FONT = '"Source Han Sans CN","Microsoft YaHei","PingFang SC","Heiti SC",SimHei,sans-serif';

/**
 * 封面：产品图 + 底部金条标题区
 * @param {object} product 产品数据
 * @param {Buffer} imgBuf 处理好的产品图 buffer（1242宽）
 * @param {string} bigTitle 封面大标题（中文，2-4字最佳）
 * @param {string} subTitles 副标题/卖点（数组）
 */
function coverOverlay(product, bigTitle, subLines) {
  // 底部金色标题区高度
  const titleBarH = 460;
  const imgH = H - titleBarH; // 1196

  // 标题字号：根据字数自适应（字少就大，字多就小），增强冲击力
  const titleLen = bigTitle ? bigTitle.length : 2;
  let titleSize = 130;
  if (titleLen <= 2) titleSize = 150;
  else if (titleLen <= 3) titleSize = 130;
  else if (titleLen <= 4) titleSize = 110;
  else titleSize = 80;

  const subs = (subLines || []).map((s, i) =>
    `<text x="${W/2}" y="${imgH + 280 + i*56}" font-family='${CN_FONT}' font-size="40" fill="#e8d9b8" text-anchor="middle" letter-spacing="2">${escapeXml(s)}</text>`
  ).join('');

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0"/>
        <stop offset="60%" stop-color="#000" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${DARK}" stop-opacity="0.98"/>
      </linearGradient>
      <linearGradient id="goldbar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${GOLD}"/>
        <stop offset="50%" stop-color="${GOLD_LIGHT}"/>
        <stop offset="100%" stop-color="${GOLD}"/>
      </linearGradient>
    </defs>

    <!-- 顶部金色边 -->
    <rect x="0" y="0" width="${W}" height="10" fill="url(#goldbar)"/>
    <!-- 左上品牌角标 -->
    <rect x="50" y="60" width="400" height="66" rx="33" fill="rgba(26,26,26,0.65)"/>
    <text x="250" y="103" font-family='${CN_FONT}' font-size="32" fill="${GOLD_LIGHT}" text-anchor="middle" letter-spacing="4">奢石世界 · 贝奈利</text>

    <!-- 右上品类标签 -->
    ${product.cat ? `<rect x="${W-450}" y="60" width="400" height="66" rx="33" fill="rgba(184,150,90,0.95)"/>
    <text x="${W-250}" y="103" font-family='${CN_FONT}' font-size="30" fill="#fff" text-anchor="middle" letter-spacing="3">${escapeXml(product.cat)}</text>` : ''}

    <!-- 渐变过渡（图片底部到标题区融合）-->
    <rect x="0" y="${imgH - 240}" width="${W}" height="${titleBarH + 240}" fill="url(#fade)"/>

    <!-- 底部标题区 -->
    <rect x="0" y="${imgH}" width="${W}" height="${titleBarH}" fill="${DARK}"/>
    <rect x="0" y="${imgH}" width="${W}" height="4" fill="url(#goldbar)"/>

    <!-- 大标题（自适应字号，垂直居中偏上）-->
    <text x="${W/2}" y="${imgH + 170}" font-family='${CN_FONT}' font-size="${titleSize}" font-weight="bold" fill="#fff" text-anchor="middle" letter-spacing="6">${escapeXml(bigTitle)}</text>

    <!-- 金色分隔线 -->
    <line x1="${W/2-70}" y1="${imgH + 215}" x2="${W/2+70}" y2="${imgH + 215}" stroke="${GOLD}" stroke-width="3"/>

    <!-- 副标题/卖点 -->
    ${subs}

    <!-- 底部品牌信息 -->
    <text x="${W/2}" y="${H - 45}" font-family="Arial" font-size="28" fill="${GOLD_LIGHT}" text-anchor="middle" letter-spacing="3">sinteredstoneworld.com</text>
  </svg>`;

  return Buffer.from(svg);
}

/**
 * 内页：产品图全屏 + 底部金色说明条
 * @param {Buffer} imgBuf 产品图
 * @param {string} caption 图说（卖点/参数）
 */
function innerOverlay(caption) {
  const barH = 200;
  const imgH = H - barH;

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldbar2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${GOLD}"/>
        <stop offset="50%" stop-color="${GOLD_LIGHT}"/>
        <stop offset="100%" stop-color="${GOLD}"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${imgH}" width="${W}" height="${barH}" fill="${DARK}"/>
    <rect x="0" y="${imgH}" width="${W}" height="3" fill="url(#goldbar2)"/>

    <!-- 图说文字（支持2行）-->
    ${wrapText(caption, 28, imgH + 90, '#ffffff', 34)}

    <text x="${W/2}" y="${H - 30}" font-family="Arial" font-size="22" fill="${GOLD_LIGHT}" text-anchor="middle" letter-spacing="2">sinteredstoneworld.com</text>
  </svg>`;

  return Buffer.from(svg);
}

/**
 * 卖点卡片内页：左边产品图 + 右边卖点列表
 * 不常用，备用
 */
function featuresInner(features) {
  const barH = 200;
  const imgH = H - barH;
  let items = '';
  features.slice(0, 4).forEach((f, i) => {
    const y = imgH + 60 + i * 35;
    items += `
      <circle cx="${80}" cy="${y}" r="14" fill="${GOLD}"/>
      <text x="${80}" y="${y+6}" font-family="Arial" font-size="18" font-weight="bold" fill="#fff" text-anchor="middle">${i+1}</text>
      <text x="${110}" y="${y+6}" font-family='${CN_FONT}' font-size="30" fill="#fff">${escapeXml(f)}</text>`;
  });
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${imgH}" width="${W}" height="${barH + 50}" fill="${DARK}"/>
    ${items}
  </svg>`;
  return Buffer.from(svg);
}

// 把长文字按字符数换行成多个 text（中文）
function wrapText(text, maxCharsPerLine, startY, fill, fontSize) {
  if (!text) return '';
  const lines = [];
  let cur = '';
  for (const ch of text) {
    cur += ch;
    if (cur.length >= maxCharsPerLine) { lines.push(cur); cur = ''; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2).map((l, i) =>
    `<text x="${W/2}" y="${startY + i * (fontSize + 8)}" font-family='"Microsoft YaHei",sans-serif' font-size="${fontSize}" fill="${fill}" text-anchor="middle" letter-spacing="1">${escapeXml(l)}</text>`
  ).join('');
}

module.exports = { W, H, CN_FONT, coverOverlay, innerOverlay, featuresInner };
