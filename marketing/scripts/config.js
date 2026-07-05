/**
 * 内容工厂全局配置
 * 公司信息、品牌、路径、阿里国际站规格
 */

module.exports = {
  // ===== 公司信息 =====
  company: {
    nameCn: '华顿陶瓷',
    nameEn: 'Wharton Ceramics',
    brandCn: '贝奈利全球奢石中心',
    brandEn: 'Sintered Stone World',
    contact: 'Apple Lo',
    title: 'International Department Manager',
    email: 'apple@whartonceramics.com',
    phone: '+86 139 2313 0743',
    whatsapp: '+86 139 2313 0743',
    website: 'www.whartonceramics.com',
    website2: 'www.sinteredstoneworld.com',
    // 工厂/产能信息（占位，后续填）
    location: 'Foshan, Guangdong, China',
    founded: '',
    capacity: '',
  },

  // ===== 品牌视觉 =====
  brand: {
    primaryColor: '#b8965a',     // 金色
    primaryColorLight: '#d4b876',
    darkColor: '#1a1a1a',
    watermarkText: 'sinteredstoneworld.com',
  },

  // ===== 路径 =====
  paths: {
    projectRoot: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld',
    sourceImages: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/images',
    productsData: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/products_data.json',
    outputRoot: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/alibaba',
    mainImages: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/alibaba/main-images',
    detailPages: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/alibaba/detail-pages',
    // 小红书发布相关
    xhs: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/xiaohongshu',
    xhsCopy: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/xiaohongshu/xhs-copy.csv',
    xhsState: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/xiaohongshu/publish-state.json',
    xhsLog: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/xiaohongshu/xhs-publish.log',
    xhsReports: 'C:/Users/AppleLo/ZCodeProject/sinteredstoneworld/marketing/xiaohongshu/reports',
  },

  // ===== 阿里巴巴国际站规格 =====
  alibaba: {
    mainImage: {
      size: 800,              // 800x800px
      background: '#ffffff',  // 白底
      quality: 92,
      // 是否在主图加水印（阿里主图建议干净，水印放详情页）
      watermark: false,
    },
    detailPage: {
      width: 750,             // 详情页标准宽度
      quality: 88,
      watermark: true,
    },
    // 阿里标题规则：核心词+属性+应用，最多128字符
    title: {
      maxLength: 128,
      formula: '{material} {productName} {category} {feature} {application}',
    },
  },

  // ===== 小红书规格 =====
  xiaohongshu: {
    cover: {
      width: 1242,
      height: 1656,           // 3:4 竖图，信息流曝光最佳
      quality: 90,
    },
    inner: {
      width: 1242,
      height: 1656,           // 内页也用 3:4，保持统一
      quality: 88,
      maxCount: 8,            // 加封面最多9张
    },
    // 小红书文案规则
    copy: {
      titleMaxLen: 20,        // 标题最多20字（实际显示限制）
      descMaxLen: 1000,       // 正文最多1000字
    },
  },

  // ===== 小红书中文种草文案字典 =====
  // 每个品类对应：吸引眼球的标题模板 + 卖点 + 适用场景 + 话题标签
  xhsDict: {
    // === 奢石花色系列（slab + 花色品类）===
    'Pandora': {
      nick: '潘多拉',
      hook: ['潘多拉奢石', '高级感天花板', '侘寂风绝美'],
      tags: ['#潘多拉奢石', '#奢石背景墙', '#高级感装修', '#侘寂风', '#别墅装修', '#烧结石材'],
    },
    'Blue Emerald': {
      nick: '蓝翡翠',
      hook: ['蓝翡翠奢石', '一眼沦陷的蓝', '轻奢风首选'],
      tags: ['#蓝翡翠', '#奢石', '#轻奢装修', '#背景墙', '#蓝色系装修', '#别墅设计'],
    },
    'Prada Green': {
      nick: '普拉达绿',
      hook: ['普拉达绿奢石', '绿到心坎里', '豪宅同款'],
      tags: ['#普拉达绿', '#奢石绿', '#绿色背景墙', '#高级感', '#大平层装修', '#烧结石'],
    },
    'Bulgari Black': {
      nick: '宝格丽黑',
      hook: ['宝格丽黑奢石', '黑金质感绝了', '现代轻奢'],
      tags: ['#宝格丽黑', '#黑金风格', '#奢石背景墙', '#现代轻奢', '#高级黑', '#别墅'],
    },
    'Fendi White': {
      nick: '芬迪白',
      hook: ['芬迪白奢石', '纯净高级感', '极简风必备'],
      tags: ['#芬迪白', '#白色奢石', '#极简风装修', '#高级感', '#背景墙', '#烧结石'],
    },
    'Amazon Green': {
      nick: '亚马逊绿',
      hook: ['亚马逊绿奢石', '雨林般的高级感', '网红背景墙'],
      tags: ['#亚马逊绿', '#奢石', '#网红背景墙', '#绿色系', '#别墅装修', '#大平层'],
    },
    'Royal White Jade': {
      nick: '皇家白玉',
      hook: ['皇家白玉奢石', '温润如玉', '新中式绝配'],
      tags: ['#皇家白玉', '#白玉奢石', '#新中式', '#中式装修', '#奢石背景', '#高雅'],
    },
    'Platinum Diamond': {
      nick: '铂金钻石',
      hook: ['铂金钻石奢石', 'BlingBling的高级', '轻奢风'],
      tags: ['#铂金钻石', '#奢石', '#轻奢', '#闪亮高级感', '#背景墙', '#别墅'],
    },
    'Venice Brown': {
      nick: '威尼斯棕',
      hook: ['威尼斯棕奢石', '复古高级感', '美式轻奢'],
      tags: ['#威尼斯棕', '#棕色奢石', '#美式装修', '#复古风', '#高级感', '#烧结石'],
    },
    'Snow Mountain Orchid': {
      nick: '雪山兰',
      hook: ['雪山兰奢石', '冷艳高级感', '现代极简'],
      tags: ['#雪山兰', '#奢石', '#冷色调', '#现代极简', '#背景墙', '#别墅设计'],
    },
    'Cosmic Gold': {
      nick: '宇宙金',
      hook: ['宇宙金奢石', '金光闪闪的高级', '轻奢天花板'],
      tags: ['#宇宙金', '#金色奢石', '#轻奢装修', '#高级感', '#背景墙', '#大平层'],
    },
    // === 家具类型 ===
    'Tea Table': {
      nick: '奢石茶几',
      hook: ['奢石茶几', '客厅C位担当', '颜值与实力并存'],
      tags: ['#奢石茶几', '#客厅茶几', '#高级感客厅', '#烧结石', '#家具', '#装修'],
    },
    'Dining Table': {
      nick: '奢石餐桌',
      hook: ['奢石餐桌', '吃饭都变高级了', '餐厅颜值担当'],
      tags: ['#奢石餐桌', '#餐厅', '#高级感', '#烧结石', '#餐桌推荐', '#装修'],
    },
    'Console': {
      nick: '奢石玄关柜',
      hook: ['奢石玄关柜', '入户第一眼就惊艳', '玄关天花板'],
      tags: ['#玄关柜', '#奢石', '#玄关设计', '#高级感', '#入户', '#装修'],
    },
    'Dining Chair': {
      nick: '奢石餐椅',
      hook: ['奢石餐椅', '餐厅高级感拉满', '颜值餐椅'],
      tags: ['#餐椅', '#奢石', '#餐厅家具', '#高级感', '#椅子推荐', '#装修'],
    },
    'Tea Cart': {
      nick: '奢石茶水柜',
      hook: ['奢石茶水柜', '移动的高级感', '客厅收纳神器'],
      tags: ['#茶水柜', '#奢石', '#客厅收纳', '#高级感', '#吧台', '#装修'],
    },
    'Feature Wall': {
      nick: '奢石背景墙',
      hook: ['奢石背景墙', '一面墙撑起整个家', '客厅颜值核心'],
      tags: ['#奢石背景墙', '#背景墙', '#客厅装修', '#烧结石', '#高级感', '#别墅'],
    },
    // === 默认（天然奢石等）===
    '天然奢石': {
      nick: '天然奢石',
      hook: ['天然奢石', '大自然的艺术', '独一无二'],
      tags: ['#天然奢石', '#奢石', '#背景墙', '#高级感', '#别墅装修', '#大自然'],
    },
    '_default': {
      nick: '奢石',
      hook: ['奢石', '高级感装修', '别墅同款'],
      tags: ['#奢石', '#高级感装修', '#烧结石', '#背景墙', '#别墅', '#装修灵感'],
    },
  },

  // ===== 小红书按板块的卖点/场景文案 =====
  xhsL1Copy: {
    slab: {
     卖点: ['一板到顶无缝拼接', '耐高温防刮耐磨', '天然纹理独一无二', '抗污易清洁', '不褪色抗UV'],
      场景: ['客厅电视背景墙', '沙发背景墙', '餐厅背景墙', '玄关背景', '卫生间墙面', '厨房台面'],
      角度: ['别墅大平层首选', '网红设计师同款', '装修灵感收藏', '实景案例分享', '高颜值背景墙'],
    },
    furniture: {
      卖点: ['奢石台面 + 金属底座', '一桌提升整个空间格调', '耐磨耐高温不怕烫', '专属定制独一无二', '轻奢质感拉满'],
      场景: ['客厅', '餐厅', '玄关', '书房', '茶室', '吧台'],
      角度: ['提升幸福感的好物', '颜值家具推荐', '装修必入清单', '客厅布置灵感', '餐厅搭配'],
    },
    accessory: {
      卖点: ['搭配奢石台面', '稳固耐用', '极简设计', '可定制尺寸', '质感金属'],
      场景: ['茶几底座', '餐桌底座', '吧台', '玄关柜'],
      角度: ['家具搭配', '底座选择', '装修细节'],
    },
    case: {
      卖点: ['实景落地效果', '设计还原度高', '空间氛围感拉满'],
      场景: ['别墅', '大平层', '样板间', '酒店', '会所'],
      角度: ['装修案例', '实景分享', '设计灵感', '完工实景'],
    },
  },

  // ===== 材质/品类英文字典（用于生成标题和描述） =====
  // key = 产品 data-cat，value = 阿里SEO用英文描述
  catalogDict: {
    // === 奢石花色系列 ===
    'Pandora':              { material: 'Sintered Stone', color: 'Pandora Beige', pattern: 'luxury natural stone texture' },
    'Blue Emerald':         { material: 'Sintered Stone', color: 'Blue Emerald',  pattern: 'blue gemstone texture' },
    'Snow Mountain Orchid': { material: 'Sintered Stone', color: 'Snow Mountain Orchid', pattern: 'white veined texture' },
    'Royal White Jade':     { material: 'Sintered Stone', color: 'Royal White Jade', pattern: 'jade white texture' },
    'Patek Emerald':        { material: 'Sintered Stone', color: 'Patek Emerald', pattern: 'emerald green texture' },
    'Platinum Diamond':     { material: 'Sintered Stone', color: 'Platinum Diamond', pattern: 'platinum crystalline texture' },
    'Bulgari Black':        { material: 'Sintered Stone', color: 'Bulgari Black', pattern: 'black with gold veining' },
    'Venice Brown':         { material: 'Sintered Stone', color: 'Venice Brown', pattern: 'brown luxury texture' },
    'Fendi White':          { material: 'Sintered Stone', color: 'Fendi White', pattern: 'white marble texture' },
    'Amazon Green':         { material: 'Sintered Stone', color: 'Amazon Green', pattern: 'deep green stone texture' },
    'Blue Crystal':         { material: 'Sintered Stone', color: 'Blue Crystal', pattern: 'crystal blue texture' },
    'White Flower':         { material: 'Sintered Stone', color: 'White Flower', pattern: 'floral white texture' },
    'Cosmic Gold':          { material: 'Sintered Stone', color: 'Cosmic Gold', pattern: 'gold cosmic texture' },
    'Fendi Green':          { material: 'Sintered Stone', color: 'Fendi Green', pattern: 'green luxury texture' },
    'Prada Green':          { material: 'Sintered Stone', color: 'Prada Green', pattern: 'Prada green marble texture' },
    'Blue Sky Jade':        { material: 'Sintered Stone', color: 'Blue Sky Jade', pattern: 'sky blue jade texture' },
    'Snow Fox':             { material: 'Sintered Stone', color: 'Snow Fox', pattern: 'white fox texture' },
    'Golden Peacock':       { material: 'Sintered Stone', color: 'Golden Peacock', pattern: 'peacock gold texture' },
    'White Ice Jade':       { material: 'Sintered Stone', color: 'White Ice Jade', pattern: 'ice white jade texture' },
    'Picasso':              { material: 'Sintered Stone', color: 'Picasso', pattern: 'artistic multi-color texture' },
    'Golden Silk':          { material: 'Sintered Stone', color: 'Golden Silk', pattern: 'golden silk texture' },
    'Emerald':              { material: 'Sintered Stone', color: 'Emerald', pattern: 'emerald texture' },
    'Dream Blue':           { material: 'Sintered Stone', color: 'Dream Blue', pattern: 'dreamy blue texture' },
    '天然奢石':              { material: 'Natural Luxury Stone', color: 'Natural Stone', pattern: 'natural luxury stone texture' },

    // === 家具类型 ===
    'Tea Table':     { material: 'Sintered Stone', type: 'Coffee Tea Table', application: 'living room' },
    'Dining Table':  { material: 'Sintered Stone', type: 'Dining Table', application: 'dining room' },
    'Console':       { material: 'Sintered Stone', type: 'Console Table', application: 'entryway hallway' },
    'Tea Cart':      { material: 'Sintered Stone', type: 'Tea Cart Bar Cart', application: 'living room kitchen' },
    'Dining Chair':  { material: 'Sintered Stone', type: 'Dining Chair', application: 'dining room' },
    'Feature Wall':  { material: 'Sintered Stone', type: 'Feature Wall Panel', application: 'wall cladding' },
  },

  // ===== 一级板块英文映射 =====
  l1Dict: {
    slab:      { en: 'Luxury Sintered Stone Slab', keyword: 'sintered stone slab large format' },
    furniture: { en: 'Sintered Stone Furniture',   keyword: 'sintered stone table furniture' },
    accessory: { en: 'Furniture Accessories',      keyword: 'table base legs chair accessory' },
    case:      { en: 'Project Case Study',         keyword: 'sintered stone project application' },
  },
};
