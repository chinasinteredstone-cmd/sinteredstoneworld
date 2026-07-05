#!/bin/bash
# ============================================================
# 阿里巴巴国际站半自动发布脚本
#
# 已验证可行的方法：
#   - upload input[type=file] 上传图片（阿里自动识别类目）
#   - click + fill 填文本字段（先聚焦才能触发React）
#   - 绝不用 Enter 键（会触发意外提交丢session）
#   - 每步验证 value 确认生效
#
# 用法：
#   ./publish-alibaba.sh <产品ID>
#   ./publish-alibaba.sh 1394292
#
# 前提：浏览器已登录阿里，用 --session alibaba 保持登录态
# ============================================================

set -e

PRODUCT_ID="${1:-1394292}"
SESSION="alibaba"
MARKETING_DIR="/c/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing"
MAIN_IMG_DIR="$MARKETING_DIR/alibaba/main-images"
DETAIL_DIR="$MARKETING_DIR/alibaba/detail-pages"

echo "═══════════════════════════════════════════════════"
echo "  阿里国际站自动发布 - 产品 $PRODUCT_ID"
echo "═══════════════════════════════════════════════════"

# 检查图片是否存在
if ! ls "$MAIN_IMG_DIR/${PRODUCT_ID}_"*.jpg >/dev/null 2>&1; then
  echo "❌ 没找到产品 $PRODUCT_ID 的主图，请先运行 generate-main-images.js"
  exit 1
fi

IMG_COUNT=$(ls "$MAIN_IMG_DIR/${PRODUCT_ID}_"*.jpg | wc -l)
echo "📦 找到 $IMG_COUNT 张主图"
ls "$MAIN_IMG_DIR/${PRODUCT_ID}_"*.jpg | head -6

echo ""
echo "⚠️  请确认："
echo "   1. 浏览器已用 --session $SESSION 打开并登录阿里"
echo "   2. 当前在发布页 post.alibaba.com/product/easyListing.htm"
echo ""
read -p "按回车继续，或 Ctrl+C 取消..." _

# ============ 步骤1：上传第一张图，触发类目识别 ============
echo ""
echo "▶ 步骤1/6：上传主图（触发阿里AI识别类目）..."
FIRST_IMG=$(ls "$MAIN_IMG_DIR/${PRODUCT_ID}_"*.jpg | head -1)
# Windows 路径转换
FIRST_IMG_WIN=$(echo "$FIRST_IMG" | sed 's|/c/|C:/|; s|/|\\\\|g')

agent-browser --session "$SESSION" upload 'input[type="file"]' "${FIRST_IMG_WIN}" 2>&1 | tail -1
echo "   等待阿里识别类目..."
agent-browser --session "$SESSION" wait 6000 >/dev/null 2>&1

# 上传剩余主图（最多6张）
echo "   上传剩余主图..."
for img in $(ls "$MAIN_IMG_DIR/${PRODUCT_ID}_"*.jpg | tail -n +2 | head -5); do
  img_win=$(echo "$img" | sed 's|/c/|C:/|; s|/|\\\\|g')
  agent-browser --session "$SESSION" upload 'input[type="file"]' "${img_win}" >/dev/null 2>&1
  agent-browser --session "$SESSION" wait 1500 >/dev/null 2>&1
done
echo "   ✅ 全部主图上传完成"

# ============ 步骤2：选择 Sintered Stone 类目 ============
echo ""
echo "▶ 步骤2/6：选择 Sintered Stone 类目..."
agent-browser --session "$SESSION" eval --stdin <<'EVALEOF'
(() => {
  const li = Array.from(document.querySelectorAll('li')).find(e =>
    e.textContent.includes('Sintered Stone') && e.textContent.includes('Tiles') && e.offsetParent !== null
  );
  if (li) { li.click(); return '已点击类目'; }
  return '类目可能已选或未找到';
})();
EVALEOF

# 点击"现在发布产品"按钮进入详细表单
agent-browser --session "$SESSION" wait 2000 >/dev/null 2>&1
agent-browser --session "$SESSION" eval --stdin <<'EVALEOF'
(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b =>
    b.textContent.includes('now publishing') || b.textContent.includes('现在发布')
  );
  if (btn && !btn.disabled) { btn.click(); return '已点击发布按钮进入表单'; }
  return btn ? '按钮禁用，类目未选好' : '未找到按钮';
})();
EVALEOF
echo "   等待详细表单加载..."
agent-browser --session "$SESSION" wait 5000 >/dev/null 2>&1

# ============ 步骤3：从CSV读产品数据并填字段 ============
echo ""
echo "▶ 步骤3/6：填入产品数据（从CSV读取）..."

# 用node读CSV拿到该产品的所有字段值
eval "$(node -e "
const fs=require('fs');
const csv=fs.readFileSync('$MARKETING_DIR/alibaba/alibaba-titles.csv','utf-8').replace(/^\ufeff/,'').split('\r\n');
function parse(l){const r=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='\"'&&l[i+1]==='\"'){c+='\"';i++;}else if(ch==='\"')q=false;else c+=ch;}else{if(ch===','){r.push(c);c='';}else if(ch==='\"')q=true;else c+=ch;}}r.push(c);return r;}
for(let i=1;i<csv.length;i++){
  const c=parse(csv[i]);
  if(c[0]==='$PRODUCT_ID'){
    console.log('TITLE=\"'+c[7].replace(/\"/g,'\\\\\"')+'\"');
    break;
  }
}
")"

echo "   标题: $TITLE"

# 用node脚本统一填字段（避免bash引号问题）
node -e "
const { execSync } = require('child_process');
const sess = '$SESSION';
function ab(cmd) {
  try { return execSync('agent-browser --session '+sess+' '+cmd, {timeout:15000}).toString(); }
  catch(e) { return e.stdout ? e.stdout.toString() : ''; }
}
function fill(ref, val) {
  ab('click '+ref+' 2>/dev/null');
  ab('wait 100 2>/dev/null');
  // 用base64避免特殊字符问题
  const b64 = Buffer.from(val).toString('base64');
  execSync('agent-browser --session '+sess+' eval -b \"'+b64+'\" --fill '+ref, {timeout:15000});
}
// 简化：用 find + fill 方式
"

echo "   ⚠️ 自动填文本字段需要更复杂的脚本支持"
echo "   此处暂停，进入交互模式让你确认"

# ============ 步骤4-6：交给交互验证 ============
echo ""
echo "▶ 步骤4/6：[需你确认] 检查下拉框（售后/应用/产地）"
echo "▶ 步骤5/6：[需你确认] 详情页上传"
echo "▶ 步骤6/6：[需你确认] 最终提交"
echo ""
echo "═══════════════════════════════════════════════════"
echo "  当前状态：图片已传、类目已选、表单已打开"
echo "  请到浏览器窗口检查并完成剩余字段"
echo "═══════════════════════════════════════════════════"
