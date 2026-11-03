# 有空带娃去玩吧（gooutside）

一款帮家长找到附近**免费游乐场**的微信小程序：地图查找、距离筛选、真实评价、一键导航，支持分享场地与公益活动，中英双语，完全免费、无广告。

## 功能特性

- 🗺️ **地图找场**：自动定位 + 500m~20km 距离筛选，附近免费游乐场一目了然
- ⭐ **评分评价**：家长真实评分、文字评价、实景照片
- 🧭 **一键导航**：拉起微信内置地点页，可选腾讯 / 高德 / 百度地图
- 📸 **分享场地**：一分钟发布身边的宝藏游乐场（名称 + 位置 + 设施标签 + 6 图）
- 🔒 **隐私保护**：位置仅用于计算距离；不采集儿童个人信息；数据可随时删除；一键举报 + 3 次举报自动下架
- 🌏 **中英双语**：界面级 i18n，切换即时生效（含 tabBar / 分享标题）
- ❤️ **公益共创**：场地信息由家长志愿分享维护

## 技术栈

- 原生微信小程序（WXML / WXSS / JS）
- 云服务：PostgreSQL + Row Level Security + RPC（Haversine 球面距离查询 `playgrounds_near`）
- 微信登录（wx.login → 服务端换取 session）
- 内容合规：客户端关键词过滤（`utils/moderation.js`）+ 举报触发器

## 目录结构

```
├── app.js / app.json / app.wxss    # 全局配置（tabBar、定位权限）
├── pages/
│   ├── index/     # 首页：地图 + 距离筛选 + 列表
│   ├── detail/    # 详情：评价列表 + 导航 + 举报
│   ├── review/    # 写评价（星级 + 文字 + 图片）
│   ├── add/       # 分享游乐场
│   ├── mine/      # 我的内容 + 语言切换 + 数据管理
│   └── legal/     # 用户协议 / 隐私政策 / 儿童规则（中英）
├── components/login-panel/   # 登录面板（微信一键登录 + 邮箱验证码）
├── utils/          # api / cloud SDK 封装 / i18n / 内容合规 / 工具
└── miniprogram_npm/  # npm 构建产物（云服务 SDK）
```

## 本地运行

1. 微信开发者工具导入本项目，填入你的小程序 AppID
2. 开通云服务并配置 `utils/cloud.js`（应用 ID）
3. 创建数据表 `playground` / `review` / `report`（含 RLS 策略与举报计数触发器）
4. 在小程序管理后台配置 request / uploadFile / downloadFile 合法域名

## License

MIT
