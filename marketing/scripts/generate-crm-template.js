/**
 * 生成 询盘CRM + 数据分析 Excel（4个Sheet）
 *   1. 询盘CRM - 成交漏斗跟踪（带状态公式）
 *   2. 国家分析 - Top10高意向国家（自动统计）
 *   3. 客户类型分析 - Top客户类型
 *   4. 产品线分析 - Flexible/Soft/Sintered/Porcelain询盘占比与趋势
 *   5. 转化漏斗 - 各阶段转化率问题点
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'alibaba', 'operations');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, '询盘CRM与数据分析.xlsx');

const wb = new ExcelJS.Workbook();
wb.creator = 'Wharton Ceramics 运营';
wb.created = new Date();

const GOLD = 'FFD4B876';
const DARK = 'FF1A1A1A';

// ============ Sheet 1: 询盘CRM ============
const ws1 = wb.addWorksheet('询盘CRM', { views: [{ state: 'frozen', ySplit: 2 }] });

const crmCols = [
  { h: 'RFQ编号', w: 11 },
  { h: '询盘日期', w: 11 },
  { h: '客户公司', w: 20 },
  { h: '国家', w: 13 },
  { h: '类型', w: 12 },
  { h: '产品线', w: 14 },
  { h: '需求摘要', w: 28 },
  { h: '报价(USD)', w: 11 },
  { h: '当前阶段', w: 14, note: '询盘/报价中/样品中/谈判中/已成交/已流失' },
  { h: '阶段进度(自动)', w: 12 },
  { h: '上次跟进日期', w: 12 },
  { h: '下次跟进日期', w: 12 },
  { h: '逾期提醒(自动)', w: 18 },
  { h: '成交金额(USD)', w: 13 },
  { h: '跟进记录', w: 35 },
];

// 表头组
ws1.getRow(1).values = ['═══ 询盘成交漏斗跟踪（自动算进度+逾期提醒）═══', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
ws1.mergeCells('A1:O1');
ws1.getRow(1).getCell(1).font = { bold: true, color: { argb: GOLD }, size: 12 };
ws1.getRow(1).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
ws1.getRow(1).getCell(1).alignment = { horizontal: 'center' };
ws1.getRow(1).height = 24;

ws1.getRow(2).values = crmCols.map(c => c.h);
crmCols.forEach((c, i) => {
  ws1.getColumn(i + 1).width = c.w;
  const cell = ws1.getRow(2).getCell(i + 1);
  cell.font = { bold: true, color: { argb: GOLD }, size: 10 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  if (c.note) cell.note = c.note;
});
ws1.getRow(2).height = 28;

// 示例数据 + 公式（50行）
const stages = ['询盘', '报价中', '样品中', '谈判中', '已成交', '已流失'];
const samples = [
  ['CRM-001', '2026-07-01', 'ABC Trading', 'United States', 'Importer', 'Sintered Stone', 'Pandora 9mm 500m²', 25000, '报价中', '', '2026-07-02', '2026-07-05', '', '', '已报FOB价，等客户反馈'],
  ['CRM-002', '2026-07-02', 'HD Hotel', 'UAE', 'Contractor', 'Flexible Stone', '外墙翻新 2000m²', 80000, '样品中', '', '2026-07-03', '2026-07-06', '', '', '样品已寄DHL，等确认效果'],
  ['CRM-003', '2026-07-03', 'QWE Dist', 'Germany', 'Distributor', 'Porcelain Slab', '30款畅销花色 1柜', 35000, '已成交', '', '2026-07-04', '', '', 35000, '已付30%定金，生产中'],
];

for (let i = 0; i < 50; i++) {
  const r = i + 3;
  const row = ws1.getRow(r);
  const s = i < samples.length ? samples[i] : Array(15).fill('');

  row.values = [
    s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], '', s[10], s[11], '', s[13], s[14]
  ];

  // J列：阶段进度（自动）— 根据I列阶段算百分比
  row.getCell(10).value = {
    formula: `=IF($I${r}="","",` +
      `IFS(` +
        `$I${r}="询盘",10%,` +
        `$I${r}="报价中",30%,` +
        `$I${r}="样品中",50%,` +
        `$I${r}="谈判中",75%,` +
        `$I${r}="已成交",100%,` +
        `$I${r}="已流失",0%))`,
  };

  // M列：逾期提醒（自动）— 比较下次跟进日期和今天
  row.getCell(13).value = {
    formula:
      `=IF($A${r}="","",` +
      `IF($L${r}="","",` +
      `IF($L${r}<TODAY(),"🔴 已逾期"&(TODAY()-$L${r})&"天",` +
      `IF($L${r}=TODAY(),"🟡 今天要跟",` +
      `"🟢 还剩"&($L${r}-TODAY())&"天"))))`,
  };

  row.eachCell({ includeEmpty: false }, (cell) => {
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.font = { size: 10 };
  });
  row.height = 22;
}

// 阶段进度数据条
ws1.addConditionalFormatting({
  ref: 'J3:J52',
  rules: [{
    type: 'dataBar',
    cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }],
    color: { argb: 'FFD4B876' },
  }],
});

// ============ Sheet 2: 国家分析 ============
const ws2 = wb.addWorksheet('国家分析');
ws2.addRow(['═══ Top 10 高意向国家（自动统计询盘CRM表）═══']);
ws2.getRow(1).getCell(1).font = { bold: true, color: { argb: GOLD }, size: 12 };
ws2.getRow(1).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
ws2.mergeCells('A1:E1');
ws2.getRow(1).height = 24;

ws2.addRow([]);
const ws2Header = ws2.addRow(['排名', '国家', '询盘数', '成交数', '成交金额(USD)']);
ws2Header.eachCell(c => {
  c.font = { bold: true, color: { argb: GOLD } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  c.alignment = { horizontal: 'center' };
});

// 公式：从询盘CRM统计每个国家
const topCountries = ['United States', 'Australia', 'Canada', 'United Kingdom', 'Germany',
  'UAE', 'Saudi Arabia', 'France', 'Italy', 'Spain', 'Mexico', 'Other'];
topCountries.forEach((country, i) => {
  const r = i + 4;
  const row = ws2.addRow([
    i + 1, country,
    { formula: `=COUNTIF(询盘CRM!$D$3:$D$52,"${country}")` },
    { formula: `=COUNTIFS(询盘CRM!$D$3:$D$52,"${country}",询盘CRM!$I$3:$I$52,"已成交")` },
    { formula: `=SUMIFS(询盘CRM!$N$3:$N$52,询盘CRM!$D$3:$D$52,"${country}")` },
  ]);
  row.eachCell(c => { c.border = thinBorder(); c.alignment = { horizontal: 'center' }; });
});

ws2.addRow([]);
ws2.addRow(['═══ 使用说明 ═══']).getCell(1).font = { bold: true, color: { argb: GOLD } };
ws2.addRow(['1. 先在"询盘CRM"表填询盘数据']);
ws2.addRow(['2. 本表自动统计各国询盘数/成交数/金额']);
ws2.addRow(['3. 排序看Top，重点市场加大投入']);
ws2.addRow(['重点市场判断标准: 询盘>10 且 成交转化率>20%']);

// ============ Sheet 3: 客户类型分析 ============
const ws3 = wb.addWorksheet('客户类型分析');
ws3.addRow(['═══ Top 客户类型分析（Importer / Contractor / Distributor / Designer）═══']);
ws3.getRow(1).getCell(1).font = { bold: true, color: { argb: GOLD }, size: 12 };
ws3.getRow(1).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
ws3.mergeCells('A1:E1');
ws3.getRow(1).height = 24;
ws3.addRow([]);

const ws3H = ws3.addRow(['客户类型', '询盘数', '占比', '成交数', '转化率']);
ws3H.eachCell(c => {
  c.font = { bold: true, color: { argb: GOLD } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  c.alignment = { horizontal: 'center' };
});

['Importer', 'Contractor', 'Distributor', 'Designer', 'Architect', 'Other'].forEach((t, i) => {
  const r = i + 4;
  const row = ws3.addRow([
    t,
    { formula: `=COUNTIF(询盘CRM!$E$3:$E$52,"${t}")` },
    { formula: `=IF(B${r}=0,0,B${r}/SUM($B$4:$B$9))` },
    { formula: `=COUNTIFS(询盘CRM!$E$3:$E$52,"${t}",询盘CRM!$I$3:$I$52,"已成交")` },
    { formula: `=IF(B${r}=0,0,D${r}/B${r})` },
  ]);
  row.getCell(3).numFmt = '0.0%';
  row.getCell(5).numFmt = '0.0%';
  row.eachCell(c => { c.border = thinBorder(); c.alignment = { horizontal: 'center' }; });
});

ws3.addRow([]);
ws3.addRow(['💡 分析建议:']);
ws3.addRow(['- Importer 占比高 → 重点优化阶梯价/整柜价']);
ws3.addRow(['- Contractor 占比高 → 重点发项目案例/施工指南']);
ws3.addRow(['- Distributor 占比高 → 推区域独家代理政策']);
ws3.addRow(['- Designer 占比高 → 多发图册/案例/AI效果图']);

// ============ Sheet 4: 产品线分析 ============
const ws4 = wb.addWorksheet('产品线分析');
ws4.addRow(['═══ 4产品线询盘占比与增长（Flexible/Soft/Sintered/Porcelain）═══']);
ws4.getRow(1).getCell(1).font = { bold: true, color: { argb: GOLD }, size: 12 };
ws4.getRow(1).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
ws4.mergeCells('A1:F1');
ws4.getRow(1).height = 24;
ws4.addRow([]);

const ws4H = ws4.addRow(['产品线', '询盘数', '占比', '成交数', '成交金额', '说明']);
ws4H.eachCell(c => {
  c.font = { bold: true, color: { argb: GOLD } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  c.alignment = { horizontal: 'center' };
});

const products = [
  ['Flexible Stone', '差异化新品，翻新/外墙强卖点'],
  ['Soft Ceramic', '设计师/别墅客户，环保卖点'],
  ['Sintered Stone', '主推产品，奢石背景墙'],
  ['Porcelain Slab', '走量产品，经销批发'],
];
products.forEach((p, i) => {
  const r = i + 4;
  const row = ws4.addRow([
    p[0],
    { formula: `=COUNTIF(询盘CRM!$F$3:$F$52,"${p[0]}")` },
    { formula: `=IF(B${r}=0,0,B${r}/SUM($B$4:$B$7))` },
    { formula: `=COUNTIFS(询盘CRM!$F$3:$F$52,"${p[0]}",询盘CRM!$I$3:$I$52,"已成交")` },
    { formula: `=SUMIFS(询盘CRM!$N$3:$N$52,询盘CRM!$F$3:$F$52,"${p[0]}")` },
    p[1],
  ]);
  row.getCell(3).numFmt = '0.0%';
  row.eachCell(c => { c.border = thinBorder(); c.alignment = { horizontal: 'center', wrapText: true }; });
});

ws4.addRow([]);
ws4.addRow(['═══ 月度趋势（手动填，看增长）═══']).getCell(1).font = { bold: true, color: { argb: GOLD } };
const trendH = ws4.addRow(['月份', 'Flexible Stone', 'Soft Ceramic', 'Sintered Stone', 'Porcelain Slab', '合计']);
trendH.eachCell(c => {
  c.font = { bold: true, color: { argb: GOLD } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  c.alignment = { horizontal: 'center' };
});
['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].forEach(m => {
  const row = ws4.addRow([m, '', '', '', '', { formula: `=SUM(B{r}:E{r})`.replace('{r}', ws4.rowCount + 1) }]);
  row.eachCell(c => { c.border = thinBorder(); c.alignment = { horizontal: 'center' }; });
});

ws4.addRow([]);
ws4.addRow(['💡 增长判断:']);
ws4.addRow(['- Flexible Stone 环比增长>20% → 加大内容投入（小红书/独立站专题）']);
ws4.addRow(['- Soft Ceramic 连续3月增长 → 做专题页+样品包促销']);
ws4.addRow(['- Sintered Stone 是基本盘，保持稳定即可']);
ws4.addRow(['- Porcelain Slab 增长乏力 → 优化经销商政策或降价']);

// ============ Sheet 5: 转化漏斗 ============
const ws5 = wb.addWorksheet('转化漏斗分析');
ws5.addRow(['═══ 询盘→成交 转化漏斗（找出最大流失环节）═══']);
ws5.getRow(1).getCell(1).font = { bold: true, color: { argb: GOLD }, size: 12 };
ws5.getRow(1).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
ws5.mergeCells('A1:E1');
ws5.getRow(1).height = 24;
ws5.addRow([]);

const ws5H = ws5.addRow(['漏斗阶段', '数量(自动)', '占总询盘', '阶段转化率', '诊断建议']);
ws5H.eachCell(c => {
  c.font = { bold: true, color: { argb: GOLD } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  c.alignment = { horizontal: 'center' };
});

const funnel = [
  ['1.询盘总量', { f: `=COUNTA(询盘CRM!$A$3:$A$52)` }, '100%', '—', '行业平均月询盘>50算健康'],
  ['2.已报价', { f: `=COUNTIF(询盘CRM!$I$3:$I$52,"报价中")+COUNTIF(询盘CRM!$I$3:$I$52,"样品中")+COUNTIF(询盘CRM!$I$3:$I$52,"谈判中")+COUNTIF(询盘CRM!$I$3:$I$52,"已成交")` }, '', '', '转化率<60%→欢迎语/FAQ要优化'],
  ['3.已寄样品', { f: `=COUNTIF(询盘CRM!$I$3:$I$52,"样品中")+COUNTIF(询盘CRM!$I$3:$I$52,"谈判中")+COUNTIF(询盘CRM!$I$3:$I$52,"已成交")` }, '', '', '样品转化率<30%→样品质量/选品要调'],
  ['4.谈判中', { f: `=COUNTIF(询盘CRM!$I$3:$I$52,"谈判中")+COUNTIF(询盘CRM!$I$3:$I$52,"已成交")` }, '', '', '谈判转化率<50%→价格/付款条件需调整'],
  ['5.已成交', { f: `=COUNTIF(询盘CRM!$I$3:$I$52,"已成交")` }, '', '', '行业平均3-8%为健康'],
];
funnel.forEach((s, i) => {
  const r = i + 4;
  const row = ws5.addRow([s[0], { formula: s[1].f }, '', '', s[4]]);
  if (i > 0) {
    row.getCell(3).value = { formula: `=IF($B$4=0,0,B${r}/$B$4)` };
    row.getCell(3).numFmt = '0.0%';
    row.getCell(4).value = { formula: `=IF(B${r-1}=0,0,B${r}/B${r-1})` };
    row.getCell(4).numFmt = '0.0%';
  }
  row.getCell(2).alignment = { horizontal: 'center' };
  row.getCell(5).alignment = { wrapText: true };
  row.eachCell(c => { c.border = thinBorder(); });
});

ws5.addRow([]);
ws5.addRow(['═══ 转化率问题点诊断 ═══']).getCell(1).font = { bold: true, color: { argb: GOLD } };
ws5.addRow(['❶ 询盘→报价 转化率低（<60%）']);
ws5.addRow(['   问题: 欢迎语没吸引力 / FAQ没答到点 / 回复太慢']);
ws5.addRow(['   对策: 优化欢迎语、加自动FAQ、24h必回（见01-询盘转化三件套）']);
ws5.addRow([]);
ws5.addRow(['❷ 报价→样品 转化率低（<30%）']);
ws5.addRow(['   问题: 报价后没主动推样品 / 客户对价格犹豫']);
ws5.addRow(['   对策: 报价必带"free sample"话术，主动寄']);
ws5.addRow([]);
ws5.addRow(['❸ 样品→谈判 转化率低（<50%）']);
ws5.addRow(['   问题: 样品寄出后没跟 / 客户拿到样品没紧迫感']);
ws5.addRow(['   对策: 样品寄出后3天必跟，催效果反馈+限量报价']);
ws5.addRow([]);
ws5.addRow(['❹ 谈判→成交 转化率低（<50%）']);
ws5.addRow(['   问题: 价格谈不拢 / 付款条件 / 信任不足']);
ws5.addRow(['   对策: 主推信保交易（TrustBadge）/ 阶梯价 / 限时优惠']);
ws5.addRow([]);
ws5.addRow(['❺ 整体转化率低（<3%）']);
ws5.addRow(['   问题: 询盘质量差（C类多）/ 产品力不足']);
ws5.addRow(['   对策: 用智能提问筛A类，主推Flexible Stone差异化']);

// 保存
wb.xlsx.writeFile(outFile).then(() => {
  console.log(`✅ 询盘CRM+数据分析Excel已生成: ${outFile}`);
  console.log(`   含5个Sheet: 询盘CRM / 国家分析 / 客户类型分析 / 产品线分析 / 转化漏斗`);
});

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  };
}
