# 云寓租房 · 用户端小程序

基于 **uni-app + Vue 3** 开发的在线租房微信小程序，覆盖找房、看房、咨询的完整链路。

## 功能

- 首页：定位城市、热门城市、房源推荐
- 城市选择：按拼音/首字母检索
- 房源列表：区域、租金、居室、租房类型、排序等多条件筛选
- 房源详情：图片、价格、户型、面积、楼层、设施、标签、地图
- 登录：手机号验证码登录 / 微信一键登录，未注册自动注册
- 个人中心：资料编辑、退出登录
- 在线咨询：与房源发布者实时聊天，支持文本、图片、语音、房源卡片
- 消息：会话列表、未读数、历史消息分页

## 技术栈

| 分类 | 技术 |
| :--- | :--- |
| 框架 | uni-app 3（Vue 3） |
| 构建 | Vite 5 |
| 状态管理 | Pinia + pinia-plugin-persistedstate |
| UI | uni-ui、自定义组件 |
| 网络 | uni.request 封装、请求/响应拦截器 |
| 实时通信 | uni.connectSocket + WebSocket 心跳 |

## 目录结构

```text
src
├── api            # 接口定义
├── components     # 通用组件
├── constants      # 常量（OSS 地址、WebSocket 地址等）
├── pages          # 页面
│   ├── index      # 首页
│   ├── city-select# 城市选择
│   ├── list       # 房源列表
│   ├── detail     # 房源详情
│   ├── chat       # 聊天
│   ├── message    # 消息
│   ├── mine       # 我的
│   ├── login      # 登录
│   └── edit       # 资料编辑
├── static         # 静态资源与图标
├── stores         # Pinia 状态
└── utils          # 请求、校验、时间、WebSocket 等工具
```

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev:mp-weixin
```

编译产物位于 `dist/dev/mp-weixin`，命令会持续监听源码变化。

### 3. 生产构建

```bash
npm run build:mp-weixin
```

产物位于 `dist/build/mp-weixin`。

> 仓库中已提交 `dist/build/mp-weixin` 构建产物，可直接用微信开发者工具导入，无需在本地构建；修改源码后再执行上述命令重新生成。

### 4. 用微信开发者工具导入

1. 打开微信开发者工具，选择「导入项目」。
2. 目录选择 `dist/dev/mp-weixin`（或 `dist/build/mp-weixin`），注意是 `mp-weixin` 这一层，不是 `dist` 根目录。
3. AppID 使用自己的小程序 AppID 或「测试号」。
4. 在「详情 → 本地设置」中勾选：
   **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**。

## 后端地址配置

| 配置 | 文件 | 默认值 |
| :--- | :--- | :--- |
| HTTP 接口 | `src/utils/request.js` | `http://127.0.0.1:18080` |
| WebSocket | `src/constants/common.js` | `ws://127.0.0.1:18080/chat/websocket` |

- 开发者工具模拟器与后端在同一台电脑时，保持 `127.0.0.1` 即可。
- 真机预览时，`127.0.0.1` 指向手机自身，需要改成电脑的局域网 IP（如 `192.168.1.100`），并确保手机与电脑在同一 Wi-Fi、防火墙放行 18080。
- 修改后重新执行 `npm run dev:mp-weixin` 或 `npm run build:mp-weixin`。

## 本地测试登录

本地后端未接入真实短信服务，验证码固定为 **`123456`**：

1. 输入任意合法的 11 位手机号；
2. 点击「获取验证码」；
3. 输入 `123456` 登录。

验证码 5 分钟内有效，同一手机号 1 分钟内不可重复获取，登录成功后验证码立即失效。

## 说明

- 请将 `src/manifest.json` 中 `mp-weixin.appid` 替换为自己的小程序 AppID。
- 部分图标和图片仍引用外部 OSS 地址，正式部署时请替换为自己的资源。
- 本项目为个人学习/实战项目，非生产系统。
