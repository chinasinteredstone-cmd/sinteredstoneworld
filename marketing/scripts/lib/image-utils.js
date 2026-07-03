/**
 * 图像处理工具库
 * 基于 sharp，提供：
 *  - fitIntoSquare: 把任意比例图居中放进正方形白底
 *  - addWatermark: 在图底部加品牌水印条
 *  - listImagesByProduct: 列出某产品的所有图（按 _0 _1 顺序）
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * 把任意比例图片裁成正方形（cover 居中裁剪，保留场景背景）
 * 适合阿里主图：保留原图背景，只统一尺寸为正方形
 * @param {string} inputPath 源图
 * @param {string} outputPath 输出
 * @param {number} size 正方形边长
 * @param {object} opts { quality }
 */
async function fitIntoSquare(inputPath, outputPath, size = 800, opts = {}) {
  const quality = opts.quality || 92;

  await sharp(inputPath)
    .resize(size, size, {
      fit: 'cover',      // 填满正方形，多出的边裁掉（居中裁剪）
      position: 'centre',
    })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality, mozjpeg: true })
    .toFile(outputPath);
}

/**
 * 把图按宽度缩放（详情页用，保持比例，最大宽 750）
 */
async function resizeByWidth(inputPath, outputPath, width = 750, opts = {}) {
  const background = opts.background || '#ffffff';
  const quality = opts.quality || 88;

  await sharp(inputPath)
    .resize({ width, withoutEnlargement: false })
    .flatten({ background })
    .jpeg({ quality, mozjpeg: true })
    .toFile(outputPath);
}

/**
 * 在图片底部加品牌水印条（金色细条 + 网址）
 * 用于详情页图（主图不加水印）
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {object} opts { width, text, textColor, bgColor }
 */
async function addBottomWatermark(inputPath, outputPath, opts = {}) {
  const width = opts.width || 750;
  const text = opts.text || 'sinteredstoneworld.com';
  const textColor = opts.textColor || '#d4b876'; // 金色
  const bgColor = opts.bgColor || '#1a1a1a';     // 深色条

  const img = await sharp(inputPath).metadata();
  // 先统一宽度
  let pipeline = sharp(inputPath).resize({ width, withoutEnlargement: false });

  const barHeight = 42;

  // 创建底部水印条（SVG 转 PNG）
  const svgBar = Buffer.from(
    `<svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${barHeight}" fill="${bgColor}"/>
      <text x="${width / 2}" y="${barHeight / 2 + 5}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="2">${escapeXml(text)}</text>
    </svg>`
  );

  const bar = await sharp(svgBar).png().toBuffer();

  await pipeline
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: opts.quality || 88 })
    .extend({
      top: 0,
      bottom: barHeight,
      left: 0,
      right: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .composite([{ input: bar, top: undefined, left: 0 }])
    .toFile(outputPath)
    .catch(async () => {
      // 兜底：extend 后 composite 不行就直接纵向拼接
      const baseBuf = await sharp(inputPath)
        .resize({ width, withoutEnlargement: false })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 88 })
        .toBuffer();
      const baseMeta = await sharp(baseBuf).metadata();
      await sharp({
        create: {
          width,
          height: baseMeta.height + barHeight,
          channels: 3,
          background: '#ffffff',
        },
      })
        .composite([
          { input: baseBuf, top: 0, left: 0 },
          { input: bar, top: baseMeta.height, left: 0 },
        ])
        .jpeg({ quality: 88 })
        .toFile(outputPath);
    });
}

/**
 * 纵向拼接多张图为详情页长图
 * @param {string[]} imagePaths 按顺序的图片
 * @param {string} outputPath
 * @param {number} width 统一宽度
 */
async function stackVertical(imagePaths, outputPath, width = 750) {
  // 先把所有图统一宽度，拿到各自高度
  const bufs = [];
  let totalHeight = 0;
  for (const p of imagePaths) {
    const b = await sharp(p).resize({ width, withoutEnlargement: false }).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer();
    const m = await sharp(b).metadata();
    bufs.push({ buf: b, top: totalHeight, height: m.height });
    totalHeight += m.height;
  }

  // 创建大画布并合成
  const canvas = sharp({
    create: { width, height: totalHeight, channels: 3, background: '#ffffff' },
  });

  await canvas
    .composite(bufs.map(b => ({ input: b.buf, top: b.top, left: 0 })))
    .jpeg({ quality: 88 })
    .toFile(outputPath);
}

/**
 * 列出某产品的所有图片（按 _0 _1 _2 顺序）
 * @param {string} imagesDir images 文件夹
 * @param {string} productId 产品ID（如 1394292）
 * @returns {string[]} 完整路径数组
 */
function listImagesByProduct(imagesDir, productId) {
  const files = fs.readdirSync(imagesDir);
  return files
    .filter(f => {
      const name = path.parse(f).name; // 1394292_0
      const [pid, idx] = name.split('_');
      return pid === productId && idx !== undefined;
    })
    .sort((a, b) => {
      const ia = parseInt(a.split('_')[1]);
      const ib = parseInt(b.split('_')[1]);
      return ia - ib;
    })
    .map(f => path.join(imagesDir, f));
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

module.exports = { fitIntoSquare, resizeByWidth, addBottomWatermark, stackVertical, listImagesByProduct, escapeXml };
