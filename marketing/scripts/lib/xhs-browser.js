/**
 * 小红书创作者中心 浏览器自动化发布（基于 agent-browser CLI）
 *
 * 设计要点：
 * - 复用 --session xhs 的登录态（首次需 --headed 手动登录）
 * - 所有元素定位用"语义查找"（eval + 文本/属性），不依赖易变的 @ref
 * - 每个步骤后校验，失败抛出带上下文的错误
 * - --dry 模式走完所有填表步骤，只在最后"点发布"前停下
 *
 * 依赖：agent-browser 已安装并可在 PATH 中调用
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/** agent-browser 命令前缀（含 session 复用） */
const SESSION = 'xhs';

/**
 * 调 agent-browser，返回 stdout（trim 后）
 * @param {...string} args
 * @returns {string}
 */
function runAB(...args) {
  const fullArgs = ['--session', SESSION, ...args];
  const res = spawnSync('agent-browser', fullArgs, {
    encoding: 'utf-8',
    timeout: 120000,
    shell: true, // Windows 下需要
  });
  if (res.error) throw new Error(`agent-browser 调用失败: ${res.error.message}`);
  if (res.status !== 0) {
    const tail = (res.stderr || res.stdout || '').slice(-300);
    throw new Error(`agent-browser 退出码 ${res.status}: ${tail}`);
  }
  return (res.stdout || '').trim();
}

/** 等待毫秒 */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * 执行浏览器内 JS（eval --stdin 方式，避免 shell 转义问题）
 * @param {string} jsCode
 * @returns {string} eval 的返回值（字符串）
 */
function evalInPage(jsCode) {
  const res = spawnSync('agent-browser', ['--session', SESSION, 'eval', '--stdin'], {
    input: jsCode,
    encoding: 'utf-8',
    timeout: 120000,
    shell: true,
  });
  if (res.error) throw new Error(`eval 调用失败: ${res.error.message}`);
  if (res.status !== 0) {
    throw new Error(`eval 退出码 ${res.status}: ${(res.stderr || res.stdout || '').slice(-300)}`);
  }
  return (res.stdout || '').trim();
}

/** 拍快照（交互元素），返回文本 */
function snapshot() {
  return runAB('snapshot', '-i');
}

/**
 * 单篇发布流程
 * @param {Object} opts
 * @param {Object} opts.product   parseXhsCsv 的行对象（含 id/title/fullBody）
 * @param {string} opts.xhsDir    小红书素材根目录（含 {id}/cover.jpg 等）
 * @param {string} opts.publishUrl
 * @param {boolean} opts.dry      true=不点发布
 * @param {string} opts.shotPath  截图保存路径（可选）
 * @param {Object} opts.logger    { log(msg), err(msg) }
 * @returns {Object} { ok, noteUrl, screenshot }
 */
async function publishOne(opts) {
  const { product: p, xhsDir, publishUrl, dry, shotPath, logger } = opts;
  const log = logger.log || (() => {});
  const err = logger.err || (() => {});

  // 0. 收集该产品的所有图片
  const imgDir = path.join(xhsDir, p.id);
  if (!fs.existsSync(imgDir)) throw new Error(`产品图片目录不存在: ${imgDir}`);
  const imgs = fs.readdirSync(imgDir)
    .filter(f => /^cover\.jpg$|^\d+\.jpg$/i.test(f))
    .sort((a, b) => {
      // cover.jpg 永远第一，其余按数字升序
      if (a === 'cover.jpg') return -1;
      if (b === 'cover.jpg') return 1;
      return parseInt(a) - parseInt(b);
    })
    .map(f => path.join(imgDir, f));
  if (imgs.length === 0) throw new Error(`产品 ${p.id} 没有图片`);
  const imgPaths = imgs.map(f => `"${f}"`).join(' ');

  // 1. 打开发布页
  log(`[${p.id}] 打开发布页...`);
  runAB('open', `"${publishUrl}"`);
  runAB('wait', '--load', 'networkidle');
  sleep(1500);

  // 2. 登录态检测
  log(`[${p.id}] 检测登录态...`);
  const snap = snapshot();
  // 已登录页面会含 "发布笔记" / "上传图文"；未登录会跳到登录页
  if (!snap.includes('发布笔记') && !snap.includes('上传图文')) {
    throw new Error('NEEDS_LOGIN 登录态已过期，页面未出现发布入口');
  }

  // 3. 切到"上传图文" tab（默认可能是上传视频）
  log(`[${p.id}] 切换到图文 tab...`);
  evalInPage(`
    (function(){
      const tabs = Array.from(document.querySelectorAll('span.title'))
        .filter(e => e.textContent.trim() === '上传图文' && e.getBoundingClientRect().x > 0);
      if (tabs.length === 0) return 'no-tab';
      tabs[0].click();
      return 'clicked';
    })()
  `);
  sleep(800);

  // 校验 file input 现在接受图片
  const acceptCheck = evalInPage(`JSON.stringify(Array.from(document.querySelectorAll('input[type=file]')).map(i=>i.accept))`);
  if (!acceptCheck.includes('.jpg') && !acceptCheck.includes('image')) {
    throw new Error(`图文 tab 切换后 file input 仍不接受图片，accept=${acceptCheck}`);
  }

  // 4. 上传图片
  log(`[${p.id}] 上传 ${imgs.length} 张图片...`);
  // 注意：upload 命令的文件路径参数不能带额外引号（spawn 会处理），这里用单参数拼接
  runAB('upload', 'input[type=file]', ...imgs);

  // 5. 等待上传完成（轮询标题输入框出现）
  log(`[${p.id}] 等待上传完成...`);
  let titleReady = false;
  for (let i = 0; i < 30; i++) {
    sleep(1500);
    const has = evalInPage(`!!document.querySelector('input[placeholder*="标题"]')`);
    if (has === 'true') { titleReady = true; break; }
  }
  if (!titleReady) throw new Error('上传后标题输入框迟迟未出现（可能上传失败或网络慢）');

  // 6. 填标题
  log(`[${p.id}] 填写标题...`);
  const title = (p.title || '').slice(0, 20);
  // 定位标题 input 并填入（用原生 value 设置 + 触发 input 事件，兼容 React）
  evalInPage(`
    (function(){
      const el = document.querySelector('input[placeholder*="标题"]');
      if (!el) return 'no-title-input';
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, ${JSON.stringify(title)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return 'filled';
    })()
  `);
  sleep(500);

  // 7. 填正文（contenteditable）
  log(`[${p.id}] 填写正文...`);
  const fullBody = p.fullBody || '';
  const bodyLines = fullBody.split('\n');
  // 用 base64 传正文，彻底避开 shell 转义
  const bodyB64 = Buffer.from(JSON.stringify(bodyLines), 'utf-8').toString('base64');
  evalInPage(`
    (function(){
      const lines = JSON.parse(atob("${bodyB64}"));
      const ed = document.querySelector('[contenteditable=true]');
      if (!ed) return 'no-editor';
      ed.focus();
      ed.innerHTML = '';
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ed);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('insertText', false, lines[0] || '');
      for (let i = 1; i < lines.length; i++) {
        document.execCommand('insertParagraph', false);
        document.execCommand('insertText', false, lines[i]);
      }
      return 'inserted len=' + ed.innerText.length;
    })()
  `);
  sleep(600);

  // 8. 截图存档（无论 dry 与否都截）
  let screenshot = '';
  if (shotPath) {
    try {
      runAB('screenshot', `"${shotPath}"`);
      screenshot = shotPath;
      log(`[${p.id}] 已截图 → ${shotPath}`);
    } catch (e) { /* 截图失败不阻塞 */ }
  }

  // 9. dry 模式到此为止
  if (dry) {
    log(`[${p.id}] 🔍 dry 模式：已填表但未点发布`);
    return { ok: true, noteUrl: null, screenshot, dryRun: true };
  }

  // 10. 点"发布"
  log(`[${p.id}] 点击发布...`);
  // 语义定位发布按钮：找文本为"发布"的 button
  evalInPage(`
    (function(){
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.trim() === '发布' && !b.disabled);
      if (!btn) return 'no-publish-btn';
      if (btn.disabled) return 'btn-disabled';
      btn.click();
      return 'clicked';
    })()
  `);

  // 11. 校验发布成功（URL 跳转 或 出现成功提示）
  log(`[${p.id}] 校验发布结果...`);
  let ok = false;
  let noteUrl = '';
  for (let i = 0; i < 20; i++) {
    sleep(1500);
    const urlAfter = runAB('get', 'url');
    // 发布成功通常会跳到发布管理页或弹成功提示
    if (/publish\/success|publish-manage|creator\.xiaohongshu\.com\/publish\/publish/.test(urlAfter) && urlAfter !== publishUrl) {
      // 进一步检查页面是否出现"发布成功"或离开编辑态
      const snap2 = snapshot();
      if (!snap2.includes('填写标题') && !snap2.includes('上传图文')) {
        ok = true;
        noteUrl = urlAfter;
        break;
      }
    }
    // 也可能是弹窗提示成功
    const successText = evalInPage(`document.body.innerText.includes('发布成功')`);
    if (successText === 'true') { ok = true; noteUrl = urlAfter; break; }
  }

  if (!ok) {
    // 再截一张图便于排查
    if (shotPath) {
      const debugShot = shotPath.replace(/(\.\w+)?$/, '-debug$1');
      try { runAB('screenshot', `"${debugShot}"`); } catch (e) {}
    }
    throw new Error('点击发布后未检测到成功跳转/提示（可能发布按钮未生效或被风控拦截）');
  }

  log(`[${p.id}] ✅ 发布成功`);
  return { ok: true, noteUrl, screenshot, dryRun: false };
}

module.exports = { publishOne, runAB, evalInPage, snapshot, sleep };
