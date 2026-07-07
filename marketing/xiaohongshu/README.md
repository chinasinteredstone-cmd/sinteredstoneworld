# 小红书每日自动发布

每天自动发布 2 篇小红书笔记（中午 + 傍晚各 1 篇），素材来自 `xhs-copy.csv`（200 款产品）+ `{id}/` 图片目录。

> ⚠️ 小红书无个人创作者开放 API，本方案通过 **agent-browser 浏览器自动化**实现发布，依赖已登录的浏览器 session。

---

## 一次性准备

### 1. 安装依赖
```bash
# agent-browser（浏览器自动化）已全局安装
npm ls -g agent-browser
# marketing 项目依赖（sharp）
cd C:\Users\AppleLo\ZCodeProject\sinteredstoneworld\marketing
npm install
```

### 2. 首次登录小红书（保存登录态）
```bash
# headed 模式打开浏览器，手动扫码/短信登录，登录态会保存在 xhs session
agent-browser --session xhs --headed open "https://creator.xiaohongshu.com/publish/publish?source=official"
```
登录成功后，后续自动复用 cookie。**登录态一般几天到几周过期**，过期时脚本会中止并提示 `NEEDS_LOGIN`，重复此步骤重新登录即可。

---

## 日常使用

### 手动一键命令
```bash
cd C:\Users\AppleLo\ZCodeProject\sinteredstoneworld\marketing

# 试运行（走完上传+填表流程，不点发布，用于验证）
node --no-deprecation scripts\publish-xhs.js --dry --count 1

# 正式发当天 2 篇（手动触发，如出差补发）
node --no-deprecation scripts\publish-xhs.js --count 2

# 发指定产品（调试用）
node --no-deprecation scripts\publish-xhs.js --id 1394292

# 只发某品类
node --no-deprecation scripts\publish-xhs.js --cat Pandora --count 1

# 重试之前失败的产品
node --no-deprecation scripts\publish-xhs.js --retry-failed

# 查看发布进度（不发）
node --no-deprecation scripts\publish-xhs.js --list
```

### 安装每日定时任务（Windows 计划任务）
在**管理员 CMD** 中运行：
```bat
:: 中午 12:30 自动发 1 篇
schtasks /Create /SC DAILY /TN "XHS-Noon" /TR "C:\Users\AppleLo\ZCodeProject\sinteredstoneworld\marketing\scripts\xhs-publish-noon.bat" /ST 12:30

:: 傍晚 18:30 自动发 1 篇
schtasks /Create /SC DAILY /TN "XHS-Evening" /TR "C:\Users\AppleLo\ZCodeProject\sinteredstoneworld\marketing\scripts\xhs-publish-evening.bat" /ST 18:30
```

卸载：
```bat
schtasks /Delete /TN "XHS-Noon" /F
schtasks /Delete /TN "XHS-Evening" /F
```

> 计划任务需要**电脑开机**。关机错过的时段，下次手动跑 `--count 2` 补上即可（状态库保证不漏发、不重发）。

---

## 工作原理

### 文件
| 文件 | 作用 |
|---|---|
| `scripts/publish-xhs.js` | 主入口：选品、调度、写状态、出报告 |
| `scripts/lib/xhs-browser.js` | 浏览器发布流程封装（agent-browser 调用） |
| `scripts/lib/xhs-copy.js` | CSV 解析 + 状态库读写 |
| `publish-state.json` | 发布状态库（自动生成，记录每款产品的发布状态） |
| `xhs-publish.log` | 运行日志 |
| `reports/YYYY-MM-DD.md` | 每日发布报告 |
| `reports/imgs/` | 每次发布前的截图存档 |

### 选品与防重发
- 按 CSV 顺序依次发布，**已发布的永不重发**（状态库幂等）
- 失败的产品自动重试（最多 3 次），达上限需 `--retry-failed` 人工介入
- 两篇之间随机间隔 3–6 分钟，规避风控

### 单篇发布流程
1. 打开发布页 → 检测登录态
2. 切到"上传图文" → 上传 cover.jpg + 内页图
3. 填标题（≤20字）→ 填正文（种草文案 + 话题标签）
4. 截图存档 → 点击发布 → 校验成功跳转

---

## 配置
编辑 `scripts/config.local.js`（已 gitignore）：
```js
xiaohongshu: {
  sessionName: 'xhs',
  publishUrl: 'https://creator.xiaohongshu.com/publish/publish?source=official',
},
publish: {
  dryRun: true,        // true=默认试运行，确认无误后改 false 或用 --no-dry
  xhsDailyCount: 2,    // 每天发几篇
  xhsMaxAttempts: 3,   // 失败重试上限
},
```

---

## 常见问题
- **登录过期**：脚本提示 `NEEDS_LOGIN` → 用 `--headed` 重新登录一次
- **发了一半失败**：状态库会记录，下次自动重试，不会重发已成功的
- **计划任务没跑**：检查电脑是否开机、是否在睡眠（计划任务需唤醒权限）
- **想改发布时间**：删任务重建，改 `/ST` 参数
