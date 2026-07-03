/**
 * Pinterest OAuth 授权辅助脚本
 *
 * 流程：
 *   1. node pinterest-oauth.js link     → 生成授权链接（你在浏览器打开并登录）
 *   2. 浏览器跳转后，复制跳转URL给我/填入下面
 *   3. node pinterest-oauth.js token <跳转的完整URL>   → 换取 access_token
 *
 * 前提：config.local.js 已填好 pinterest.appId 和 appSecret
 */

const local = require('./config.local');

const APP_ID = local.pinterest.appId;
const APP_SECRET = local.pinterest.appSecret;
// 重定向地址：用本地回环（Pinterest 允许 http://localhost）
const REDIRECT_URI = 'https://localhost/?pinterest=callback';

// ===== 步骤1：生成授权链接 =====
function genAuthLink() {
  if (!APP_ID) {
    console.log('❌ 请先在 config.local.js 填入 pinterest.appId');
    return;
  }
  const scopes = [
    'boards:read',
    'boards:write',
    'pins:read',
    'pins:write',
  ].join(',');
  const state = 'wce' + Date.now();
  const url = `https://www.pinterest.com/oauth/?` +
    `response_type=code&` +
    `client_id=${APP_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${state}`;

  console.log('═══════════════════════════════════════════════════');
  console.log('  Pinterest 授权链接（复制到浏览器打开）');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(url);
  console.log('\n═══════════════════════════════════════════════════');
  console.log('操作步骤：');
  console.log('1. 复制上面的链接，在浏览器打开');
  console.log('2. 登录 Pinterest 并点"允许"');
  console.log('3. 浏览器会跳转（可能显示无法打开页面，没关系）');
  console.log('4. 复制浏览器地址栏的完整 URL（里面含 code=xxx）');
  console.log('5. 运行：node pinterest-oauth.js token "刚才复制的URL"');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`📝 记下这个 state（用于校验）：${state}`);
}

// ===== 步骤2：用 code 换 token =====
async function exchangeToken(callbackUrl) {
  if (!APP_ID || !APP_SECRET) {
    console.log('❌ 请先在 config.local.js 填入 appId 和 appSecret');
    return;
  }
  // 从回调URL里提取 code 和 state
  const m = callbackUrl.match(/[?&]code=([^&]+)/);
  if (!m) {
    console.log('❌ URL 里没找到 code 参数，请确认复制的是跳转后的完整URL');
    console.log('   示例: https://localhost/?pinterest=callback&code=xxxxx&state=xxxxx');
    return;
  }
  const code = decodeURIComponent(m[1]);

  // Pinterest token 接口用 Basic Auth（client_id:client_secret）
  const auth = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  try {
    const resp = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const data = await resp.json();
    if (data.access_token) {
      console.log('\n✅ 授权成功！请把下面信息填入 config.local.js\n');
      console.log(`pinterest.accessToken = "${data.access_token}"`);
      console.log(`pinterest.refresh_token = "${data.refresh_token || ''}"  (可选，token过期时用)`);
      console.log(`# token类型: ${data.token_type}, 有效期: ${data.expires_in || '?'}秒`);
      console.log('\n下一步：运行 node pinterest-oauth.js boards 查看你的画板列表');
    } else {
      console.log('❌ 换取token失败：', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log('❌ 请求失败：', e.message);
  }
}

// ===== 步骤3：列出画板（拿到 board_id 用于发Pin）=====
async function listBoards() {
  const token = local.pinterest.accessToken;
  if (!token) {
    console.log('❌ 请先完成授权（accessToken 为空）');
    return;
  }
  const resp = await fetch('https://api.pinterest.com/v5/boards?page_size=50', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await resp.json();
  if (data.items) {
    console.log('\n📋 你的 Pinterest 画板列表：\n');
    data.items.forEach(b => {
      console.log(`  [${b.id}] ${b.name}  (${b.pin_count || 0} pins)`);
    });
    console.log('\n把要发布到的画板 ID 填入 config.local.js 的 pinterest.defaultBoardId');
  } else {
    console.log('返回：', JSON.stringify(data, null, 2));
  }
}

// ===== 命令入口 =====
const cmd = process.argv[2];
if (cmd === 'link') genAuthLink();
else if (cmd === 'token') exchangeToken(process.argv[3] || '');
else if (cmd === 'boards') listBoards();
else {
  console.log('Pinterest OAuth 辅助工具\n');
  console.log('用法：');
  console.log('  node pinterest-oauth.js link                  生成授权链接');
  console.log('  node pinterest-oauth.js token "回调URL"        用code换token');
  console.log('  node pinterest-oauth.js boards                列出画板');
}
