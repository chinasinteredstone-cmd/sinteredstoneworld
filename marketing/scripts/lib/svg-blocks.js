/**
 * 详情页 SVG 模块生成器
 * 每个函数返回一个 sharp 可用的 SVG Buffer（PNG），宽度 750px
 * 用于和产品图纵向拼接成详情页长图
 */

const config = require('../config');
const { escapeXml } = require('./image-utils');

const W = 750; // 详情页标准宽度
const GOLD = config.brand.primaryColor;       // #b8965a
const GOLD_LIGHT = config.brand.primaryColorLight; // #d4b876
const DARK = config.brand.darkColor;          // #1a1a1a

/**
 * 模块1：顶部品牌横幅（深色底 + 金色Logo文字 + 产品标题）
 */
function blockHeader(product, title) {
  const c = config.company;
  const h = 200;
  const svg = `<svg width="${W}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${DARK}"/>
        <stop offset="100%" stop-color="#2d2520"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${h}" fill="url(#bg)"/>
    <rect x="0" y="0" width="${W}" height="3" fill="${GOLD}"/>
    <text x="${W/2}" y="60" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="${GOLD_LIGHT}" text-anchor="middle" letter-spacing="3">${escapeXml(c.nameEn)}</text>
    <line x1="${W/2-40}" y1="80" x2="${W/2+40}" y2="80" stroke="${GOLD}" stroke-width="1.5"/>
    <text x="${W/2}" y="115" font-family="Arial" font-size="14" fill="${GOLD_LIGHT}" text-anchor="middle" letter-spacing="4">SINTERED STONE WORLD</text>
    <text x="${W/2}" y="160" font-family="Arial" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(truncate(title, 60))}</text>
    <text x="${W/2}" y="185" font-family="Arial" font-size="13" fill="${GOLD_LIGHT}" text-anchor="middle">${escapeXml(product.cat)} · ${escapeXml(product.size.replace(/×/g,'x'))}</text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * 模块：产品图（已转 750 宽 jpg 的 buffer）
 * 返回 buffer 本身（用于拼接）
 */
async function blockImage(imgPath) {
  const sharp = require('sharp');
  return await sharp(imgPath)
    .resize({ width: W, withoutEnlargement: false })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * 模块2：产品特性（6个卖点，深色卡片）
 */
function blockFeatures() {
  const h = 360;
  // 用金色圆形序号代替 emoji（emoji 在 sharp SVG 渲染中会乱码）
  const features = [
    ['01', 'Heat Resistant', 'High temperature resistant, no deformation'],
    ['02', 'Scratch Resistant', 'Mohs hardness 6-7, durable surface'],
    ['03', 'Stain Resistant', 'Non-porous surface, easy to clean'],
    ['04', 'UV Resistant', 'Color will not fade over time'],
    ['05', 'Large Format', 'Up to 1600x3200mm, seamless look'],
    ['06', 'Luxury Texture', 'Natural stone appearance, premium feel'],
  ];
  let cards = '';
  features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 30 + col * 360;
    const y = 70 + row * 105;
    const cx = x + 42, cy = y + 55;
    cards += `
      <rect x="${x}" y="${y}" width="334" height="88" rx="8" fill="#faf8f5" stroke="${GOLD}" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="22" fill="${GOLD}"/>
      <text x="${cx}" y="${cy+6}" font-family="Arial" font-size="15" font-weight="bold" fill="#fff" text-anchor="middle">${f[0]}</text>
      <text x="${x+78}" y="${cy-4}" font-family="Arial" font-size="17" font-weight="bold" fill="${DARK}">${f[1]}</text>
      <text x="${x+78}" y="${cy+18}" font-family="Arial" font-size="12" fill="#666">${f[2]}</text>`;
  });
  const svg = `<svg width="${W}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${h}" fill="#ffffff"/>
    <text x="${W/2}" y="42" font-family="Arial" font-size="22" font-weight="bold" fill="${DARK}" text-anchor="middle">Why Choose Our Sintered Stone</text>
    <line x1="${W/2-30}" y1="56" x2="${W/2+30}" y2="56" stroke="${GOLD}" stroke-width="2"/>
    ${cards}
  </svg>`;
  return Buffer.from(svg);
}

/**
 * 模块3：应用场景（图文）
 */
function blockApplications(product) {
  const h = 260;
  let apps;
  if (product.l1 === 'slab') {
    apps = ['Kitchen Countertop', 'Bathroom Vanity', 'Wall Cladding', 'Floor Tile', 'Feature Wall', 'Table Top'];
  } else if (product.l1 === 'furniture') {
    apps = ['Living Room', 'Dining Room', 'Kitchen', 'Villa', 'Hotel', 'Restaurant'];
  } else {
    apps = ['Interior Design', 'Renovation', 'Commercial Project', 'Residential', 'Hospitality', 'Custom Project'];
  }
  const pillW = 218, pillH = 50, gap = 14;
  let pills = '';
  apps.forEach((a, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 30 + col * (pillW + gap);
    const y = 90 + row * (pillH + gap);
    pills += `
      <rect x="${x}" y="${y}" width="${pillW}" height="${pillH}" rx="25" fill="${DARK}"/>
      <text x="${x+pillW/2}" y="${y+pillH/2+5}" font-family="Arial" font-size="14" fill="${GOLD_LIGHT}" text-anchor="middle">${a}</text>`;
  });
  const svg = `<svg width="${W}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${h}" fill="#faf8f5"/>
    <text x="${W/2}" y="42" font-family="Arial" font-size="22" font-weight="bold" fill="${DARK}" text-anchor="middle">Application Scenarios</text>
    <line x1="${W/2-30}" y1="56" x2="${W/2+30}" y2="56" stroke="${GOLD}" stroke-width="2"/>
    ${pills}
  </svg>`;
  return Buffer.from(svg);
}

/**
 * 模块4：公司实力 + 联系方式（底部，深色金边）
 */
function blockCompany() {
  const c = config.company;
  const h = 360;
  const svg = `<svg width="${W}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${DARK}"/>
        <stop offset="100%" stop-color="#2d2520"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${h}" fill="url(#bg2)"/>
    <rect x="0" y="0" width="${W}" height="3" fill="${GOLD}"/>
    <text x="${W/2}" y="50" font-family="Georgia, serif" font-size="26" font-weight="bold" fill="${GOLD_LIGHT}" text-anchor="middle" letter-spacing="2">${escapeXml(c.nameEn)}</text>
    <text x="${W/2}" y="78" font-family="Arial" font-size="13" fill="${GOLD_LIGHT}" text-anchor="middle" letter-spacing="3">SINTERED STONE WORLD · 200+ STONE COLLECTIONS</text>
    <line x1="${W/2-40}" y1="98" x2="${W/2+40}" y2="98" stroke="${GOLD}" stroke-width="1.5"/>

    <text x="${W/2}" y="140" font-family="Arial" font-size="16" fill="#ffffff" text-anchor="middle">Professional Sintered Stone Manufacturer in ${escapeXml(c.location)}</text>
    <text x="${W/2}" y="168" font-family="Arial" font-size="14" fill="#bbb" text-anchor="middle">200+ luxury stone colors · OEM/ODM · Global shipping</text>

    <rect x="120" y="195" width="${W-240}" height="2" fill="${GOLD}" opacity="0.4"/>

    <text x="${W/2}" y="232" font-family="Arial" font-size="18" font-weight="bold" fill="${GOLD_LIGHT}" text-anchor="middle">Contact Us for Best Price</text>

    <text x="80" y="270" font-family="Arial" font-size="14" fill="${GOLD_LIGHT}">CONTACT</text>
    <text x="180" y="270" font-family="Arial" font-size="14" fill="#ffffff">${escapeXml(c.contact)} - ${escapeXml(c.title)}</text>
    <text x="80" y="298" font-family="Arial" font-size="14" fill="${GOLD_LIGHT}">EMAIL</text>
    <text x="180" y="298" font-family="Arial" font-size="14" fill="#ffffff">${escapeXml(c.email)}</text>
    <text x="80" y="326" font-family="Arial" font-size="14" fill="${GOLD_LIGHT}">WHATSAPP</text>
    <text x="180" y="326" font-family="Arial" font-size="14" fill="#ffffff">${escapeXml(c.whatsapp)}</text>
    <text x="80" y="354" font-family="Arial" font-size="14" fill="${GOLD_LIGHT}">WEB</text>
    <text x="180" y="354" font-family="Arial" font-size="14" fill="${GOLD_LIGHT}">${escapeXml(c.website)}  |  ${escapeXml(c.website2)}</text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * 模块：规格参数（产品尺寸 + MOQ）
 */
function blockSpec(product) {
  const h = 180;
  const size = product.size.replace(/×/g, 'x');
  const rows = [
    ['Product', product.titleEn || product.cat],
    ['Size', size || 'Custom sizes available'],
    ['Material', 'Sintered Stone / Luxury Stone'],
    ['MOQ', '1 piece (sample available)'],
    ['Customization', 'OEM/ODM supported'],
    ['Origin', config.company.location],
  ];
  let y = 70;
  let trs = '';
  rows.forEach((r, i) => {
    trs += `
      <rect x="40" y="${y-18}" width="${W-80}" height="28" fill="${i%2 ? '#ffffff' : '#faf8f5'}"/>
      <text x="60" y="${y}" font-family="Arial" font-size="13" font-weight="bold" fill="${DARK}">${escapeXml(r[0])}</text>
      <text x="280" y="${y}" font-family="Arial" font-size="13" fill="#555">${escapeXml(r[1])}</text>`;
    y += 28;
  });
  const realH = y - 70 + 80;
  const svg = `<svg width="${W}" height="${realH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${realH}" fill="#ffffff"/>
    <text x="${W/2}" y="42" font-family="Arial" font-size="22" font-weight="bold" fill="${DARK}" text-anchor="middle">Product Specifications</text>
    <line x1="${W/2-30}" y1="56" x2="${W/2+30}" y2="56" stroke="${GOLD}" stroke-width="2"/>
    ${trs}
  </svg>`;
  return Buffer.from(svg);
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

module.exports = { W, blockHeader, blockImage, blockFeatures, blockApplications, blockSpec, blockCompany };
