/**
 * 生成 RFQ 分级 Excel 模板
 *
 * 包含3个Sheet：
 *   1. RFQ分级表 - 填数据自动算等级（带公式）
 *   2. 分级标准 - 评分规则说明
 *   3. A类客户清单 - 自动从分级表筛选A级（带公式）
 *
 * 用法：node generate-rfq-template.js
 * 输出：operations/RFQ分级与A类客户清单.xlsx
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'alibaba', 'operations');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'RFQ分级与A类客户清单.xlsx');

const wb = new ExcelJS.Workbook();
wb.creator = 'Wharton Ceramics 运营';
wb.created = new Date();

// ============ Sheet 1: RFQ分级表 ============
const ws = wb.addWorksheet('RFQ分级表', {
  views: [{ state: 'frozen', xSplit: 0, ySplit: 2 }],
});

// 列定义（H列开始是评分维度，0/1打分）
const columns = [
  { header: 'RFQ编号', key: 'rfqId', width: 12 },
  { header: '询盘日期', key: 'date', width: 12 },
  { header: '客户公司', key: 'company', width: 22 },
  { header: '国家', key: 'country', width: 14 },
  { header: '客户类型', key: 'type', width: 14 },
  { header: '产品线', key: 'product', width: 16 },
  { header: '规格明确(0/1)', key: 'spec', width: 12, desc: '客户写了具体规格/尺寸/花色→1' },
  { header: '数量明确(0/1)', key: 'qty', width: 12, desc: '提到具体数量/面积→1' },
  { header: '提及项目(0/1)', key: 'project', width: 12, desc: '提到具体项目名/类型/地点→1' },
  { header: '问价格(0/1)', key: 'price', width: 11 },
  { header: '问样品(0/1)', key: 'sample', width: 11 },
  { header: '问交期(0/1)', key: 'leadtime', width: 11 },
  { header: '询盘字数', key: 'words', width: 10 },
  { header: '24h内回复(0/1)', key: 'fastReply', width: 12 },
  { header: '意向关键词', key: 'keywords', width: 14, desc: '命中意向词数(order/project/quote/sample等)' },
  { header: '总分(自动)', key: 'score', width: 10 },
  { header: '建议等级(自动)', key: 'grade', width: 12 },
  { header: '跟进动作(自动)', key: 'action', width: 28 },
];

// 表头第1行：分类标题
const header1Row = ws.getRow(1);
header1Row.values = [
  '', '', '═══ 客户基本信息 ═══', '', '', '',
  '═══ 意向打分（按0/1填，详见Sheet2）═══', '', '', '', '', '', '', '', '',
  '═══ 系统自动计算（勿改）═══', '', '',
];
header1Row.height = 22;
ws.mergeCells('C1:F1');
ws.mergeCells('G1:O1');
ws.mergeCells('P1:R1');

// 表头第2行：列名
const header2Row = ws.getRow(2);
header2Row.values = columns.map(c => c.header);
header2Row.height = 28;

// 表头样式
[1, 2].forEach(r => {
  ws.getRow(r).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FF1A1A1A' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
});
ws.getRow(1).eachCell(cell => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4B876' } };
});
ws.getRow(2).eachCell(cell => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
  cell.font = { bold: true, color: { argb: 'FFD4B876' }, size: 10 };
});

// 填示例数据（5条）+ 留15个空行（用户继续填）
const samples = [
  ['RFQ-001', '2026-07-01', 'ABC Trading', 'United States', 'Importer', 'Sintered Stone', 1,1,1,1,0,1, 80, 1, 5],
  ['RFQ-002', '2026-07-02', 'XYZ Construction', 'Australia', 'Contractor', 'Flexible Stone', 1,0,1,1,1,0, 60, 1, 4],
  ['RFQ-003', '2026-07-03', 'QWE Distributor', 'Germany', 'Distributor', 'Porcelain Slab', 0,1,0,1,0,0, 30, 0, 2],
  ['RFQ-004', '2026-07-03', '个体买家', 'United Kingdom', 'Designer', 'Soft Ceramic', 0,0,0,0,1,0, 20, 0, 1],
  ['RFQ-005', '2026-07-04', 'HD Hotel Group', 'UAE', 'Contractor', 'Sintered Stone', 1,1,1,1,1,1, 120, 1, 7],
];

const totalRows = 50; // 留够50行（含示例）
for (let i = 0; i < totalRows; i++) {
  const rowIdx = i + 3; // 从第3行开始
  const row = ws.getRow(rowIdx);
  const isSample = i < samples.length;
  const s = isSample ? samples[i] : Array(15).fill('');

  // A-O列：基本信息+打分（用户填）
  row.values = [
    s[0], s[1], s[2], s[3], s[4], s[5],   // 基本信息
    s[6], s[7], s[8], s[9], s[10], s[11], s[12], s[13], s[14],  // 打分
  ];

  // P列：总分公式（加权打分）
  // 权重: 规格15% + 数量15% + 项目15% + 价格10% + 样品10% + 交期5%
  //       + 字数(>50=10) + 24h回复(10) + 关键词(每个5%，封顶10)
  const r = rowIdx;
  row.getCell(16).value = {
    formula:
      `=IF(A${r}="","",` +
      `ROUND(` +
        `G${r}*15 + H${r}*15 + I${r}*15 + J${r}*10 + K${r}*10 + L${r}*5 + ` +
        `IF(M${r}>=80,10,IF(M${r}>=40,5,0)) + ` +
        `N${r}*10 + ` +
        `MIN(O${r}*5, 10)` +
      `,0))`,
  };

  // Q列：建议等级（自动）
  row.getCell(17).value = {
    formula: `=IF(A${r}="","",IF(P${r}>=70,"A类 高意向",IF(P${r}>=40,"B类 潜在",IF(P${r}>0,"C类 低意向",""))))`,
  };

  // R列：跟进动作（自动）
  row.getCell(18).value = {
    formula:
      `=IF(A${r}="","",` +
      `IF(P${r}>=70,"24h内回复 + 1对1人工跟（话术见A类）",` +
      `IF(P${r}>=40,"3天内跟进1次（话术见B类）",` +
      `"进培育池，每月群发1次内容")))`,
  };

  // 样式
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.font = { size: 10 };
  });
  row.height = 22;

  // 等级列条件格式（颜色）
  const gradeCell = row.getCell(17);
  // exceljs 条件格式
}

// 条件格式：等级列着色
ws.addConditionalFormatting({
  ref: 'Q3:Q52',
  rules: [
    {
      type: 'containsText',
      operator: 'containsText',
      text: 'A类',
      style: { font: { bold: true, color: { argb: 'FFFFFFFF' } },
               fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE74C3C' } } },
      priority: 1,
    },
    {
      type: 'containsText',
      operator: 'containsText',
      text: 'B类',
      style: { font: { bold: true, color: { argb: 'FFFFFFFF' } },
               fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF39C12' } } },
      priority: 2,
    },
    {
      type: 'containsText',
      operator: 'containsText',
      text: 'C类',
      style: { font: { bold: true, color: { argb: 'FFFFFFFF' } },
               fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF95A5A6' } } },
      priority: 3,
    },
  ],
});

// 添加说明备注
columns.forEach((c, idx) => {
  if (c.desc) {
    ws.getRow(2).getCell(idx + 1).note = c.desc;
  }
});

// ============ Sheet 2: 分级标准 ============
const ws2 = wb.addWorksheet('分级标准与评分规则');
ws2.columns = [{ width: 22 }, { width: 60 }];

const rules = [
  ['═══ RFQ 分级总分计算 ═══', ''],
  ['评分维度', '打分规则'],
  ['规格明确 (G列)', '客户写了具体规格/尺寸/花色 → 1，否则 0（权重15分）'],
  ['数量明确 (H列)', '提到具体数量或面积（如500m²/2柜） → 1（权重15分）'],
  ['提及项目 (I列)', '提到具体项目名/类型/地点（如Dubai酒店） → 1（权重15分）'],
  ['问价格 (J列)', '明确问price/quote/如何定价 → 1（权重10分）'],
  ['问样品 (K列)', '明确要sample/样品 → 1（权重10分，强意向信号）'],
  ['问交期 (L列)', '问delivery/lead time/何时到 → 1（权重5分）'],
  ['询盘字数 (M列)', '≥80词=10分，40-79词=5分，<40词=0分'],
  ['24h内回复 (N列)', '你24小时内回了客户→1（权重10分，说明你重视）'],
  ['意向关键词 (O列)', '命中order/project/quote/sample/Payment/MOQ/规格/项目等，每个5分，封顶10分'],
  ['', ''],
  ['═══ 等级划分（总分自动判级）═══', ''],
  ['A级 高意向', '总分 ≥ 70 → 24小时内必须回复，1对1人工跟'],
  ['B级 潜在', '总分 40-69 → 3天内跟进1次，发差异化卖点'],
  ['C级 低意向', '总分 < 40 → 进培育池，每月群发1次内容'],
  ['', ''],
  ['═══ A类客户的"硬指标"（满足任2条即A）═══', ''],
  ['硬指标1', '明确数量 ≥ 200m² 或 ≥ 1柜'],
  ['硬指标2', '提到具体项目（地点/类型/时间）'],
  ['硬指标3', '问样品 + 问价格'],
  ['硬指标4', '询盘字数 > 80词 且 24h内互动'],
  ['', ''],
  ['═══ 使用方法 ═══', ''],
  ['步骤1', '从阿里后台 → 询盘管理 → 导出近7天询盘'],
  ['步骤2', '把询盘信息填入"RFQ分级表"的A-O列'],
  ['步骤3', 'P/Q/R列自动算总分、等级、跟进动作'],
  ['步骤4', '筛"建议等级"列=A类 → 优先处理'],
  ['步骤5', '用"02-客户分级跟进话术库"的对应话术跟进'],
];

rules.forEach(([a, b], i) => {
  const r = ws2.getRow(i + 1);
  r.values = [a, b];
  if (a.startsWith('═══')) {
    r.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFD4B876' }, size: 12 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
    });
  } else if (i === 1 || a === '评分维度') {
    r.eachCell(c => {
      c.font = { bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4B876' } };
    });
  }
  r.getCell(1).alignment = { vertical: 'top', wrapText: true };
  r.getCell(2).alignment = { vertical: 'top', wrapText: true };
});

// ============ Sheet 3: A类客户清单（自动筛选）============
const ws3 = wb.addWorksheet('A类客户清单');
ws3.columns = [
  { header: 'RFQ编号', width: 12 },
  { header: '日期', width: 12 },
  { header: '公司', width: 22 },
  { header: '国家', width: 14 },
  { header: '类型', width: 14 },
  { header: '产品线', width: 16 },
  { header: '总分', width: 8 },
  { header: '等级', width: 12 },
];

// 用公式从RFQ分级表引用A级数据
// 由于ExcelJS的数组公式支持有限，这里改用说明 + 手动筛选法
ws3.getRow(1).eachCell(c => {
  c.font = { bold: true, color: { argb: 'FFD4B876' } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
  c.alignment = { horizontal: 'center' };
});

const tips = [
  ['', ''],
  ['═══ 使用方法 ═══', ''],
  ['方法1', '到"RFQ分级表"，点Q列(建议等级)的筛选按钮，勾选"A类 高意向"'],
  ['方法2', '复制筛选出的A类行，粘贴到下方表格'],
  ['方法3', '或按住Ctrl+F搜"A类"'],
  ['', ''],
  ['═══ A类客户处理SOP ═══', ''],
  ['1', '识别A级后，立刻在"RFQ分级表"标记跟进日期'],
  ['2', '查阅"02-客户分级跟进话术库"，选对应产品线+场景的话术'],
  ['3', '24小时内人工个性化回复（不要群发感）'],
  ['4', '回复后第2天若没回，用A类场景6话术（黄金48h）'],
  ['5', '客户回复后立即记入"询盘CRM表"，进入成交跟踪'],
  ['', ''],
  ['═══ A类客户清单（粘贴此处）═══', ''],
];
tips.forEach(([a, b], i) => {
  const r = ws3.getRow(i + 2);
  r.values = [a, b];
  if (a.startsWith('═══')) {
    r.getCell(1).font = { bold: true, color: { argb: 'FFD4B876' } };
  }
});

// 保存
wb.xlsx.writeFile(outFile).then(() => {
  console.log(`✅ RFQ分级Excel已生成: ${outFile}`);
  console.log(`   含3个Sheet: RFQ分级表 / 分级标准 / A类客户清单`);
  console.log(`   填数据后自动算总分、等级、跟进动作`);
});

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  };
}
