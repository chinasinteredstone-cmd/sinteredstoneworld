# 中国市场 SEO/GEO 操作指南

> 本指南列出你需要手动操作的中国搜索引擎/平台。技术层优化（robots.txt、结构化数据、中文 llms.txt）已由代码完成，以下是各站长平台的验证和提交步骤。

---

## ⚠️ 重要前提

当前网站 `sinteredstoneworld.com` 是**海外域名 + 海外服务器（Vercel），未做 ICP 备案**。
- 百度/搜狗/360 对海外站收录较慢，部分省份访问可能不稳定
- 这是政策限制，以下操作能改善但无法完全解决
- 如未来要做 ICP 备案，收录效果会大幅提升

---

## 1. 百度搜索资源平台（最重要）

**地址**：https://ziyuan.baidu.com

### 步骤
1. 用百度账号登录
2. 「用户中心」→「站点管理」→「添加网站」
3. 输入 `https://sinteredstoneworld.com`
4. 验证所有权（三选一）：
   - **文件验证**（推荐）：下载百度给的验证文件（如 `baidu_verify_xxx.html`），发给我，我加到网站根目录推送上线，然后点验证
   - **HTML 标签验证**：百度会给你一段 `<meta name="baidu-site-verification" content="xxx" />`，发给我加到首页 head
   - **CNAME 验证**：需要改 DNS，较麻烦
5. 验证成功后：
   - 「普通收录」→ 提交 sitemap：`https://sinteredstoneworld.com/sitemap.xml`
   - 「链接提交」→ 可主动推送新链接（但海外站推送 API 可能受限）

### 预期效果
- 1-4 周后百度开始零星收录
- 未备案站收录上限较低，无法保证速度

---

## 2. 搜狗站长平台

**地址**：https://zhanzhang.sogou.com

### 步骤
1. 注册/登录搜狗账号
2. 「添加站点」→ 输入 `sinteredstoneworld.com`
3. 验证方式同百度（文件验证或 meta 标签）—— 把验证文件名或 meta 发给我
4. 提交 sitemap

---

## 3. 360 搜索（好搜）

**地址**：https://zhanzhang.so.com

### 步骤
1. 登录 360 站长平台
2. 添加站点 `sinteredstoneworld.com`
3. 文件/meta 验证 —— 把验证信息发给我
4. 提交 sitemap

---

## 4. 神马搜索（UC/夸克，移动端）

**地址**：https://zhanzhang.sm.cn

### 步骤
1. 登录神马站长平台
2. 添加站点，验证方式同上
3. 提交 sitemap
4. **神马是移动端搜索引擎**，你的网站已适配移动端，收录后移动流量有保障

---

## 5. 头条搜索（字节跳动）

**地址**：https://zhanzhang.toutiao.com

### 步骤
1. 登录头条站长平台
2. 添加站点，验证
3. 提交 sitemap

---

## 6. 国产 AI（文心一言/通义千问/Kimi/DeepSeek）

国产 AI 不需要单独"提交"，它们会主动爬取公开网页。我已做的优化：
- `llms-cn.txt`：中文 AI 友好的内容索引文件
- `robots.txt` 已允许国产爬虫
- 结构化数据（JSON-LD）清晰

**你无需操作**，国产 AI 会逐步抓取并建立知识。

---

## 你需要发给我的东西

操作各平台时，把以下信息发给我，我帮你加到网站：

| 平台 | 需要什么 | 格式 |
|------|---------|------|
| 百度 | 验证文件 或 meta 标签 | 文件名如 `baidu_verify_codexxx.html`，或 `<meta name="baidu-site-verification" content="xxx" />` |
| 搜狗 | 验证文件 或 meta | 同上，`sogousiteverification` |
| 360 | 验证文件 或 meta | 同上，`360-site-verification` |
| 神马 | 验证文件 或 meta | 同上 |

拿到后我秒加秒推，你在平台点"验证"即可通过。

---

## 已完成的代码层优化（无需你操作）

✅ robots.txt 覆盖：百度/搜狗/360/神马/有道/头条爬虫
✅ 中文首页 meta keywords 扩充（30+ 长尾词：奢石茶台/背景墙/佛山奢石等）
✅ 中文首页 JSON-LD 升级为 LocalBusiness（含佛山地址、经纬度、营业时间、产品范围）
✅ 中文 llms.txt（llms-cn.txt）创建
✅ 中文 SEO 内容页 15 篇（/cn/slug/）
✅ 网站移动端适配（神马/百度移动端收录前提）
