# cortico-world-web

Coopanion 桌宠扩展 —— 给桌宠补上**网页/接口取数**的能力。

装上后桌宠多两个工具：

| 工具 | 作用 |
| --- | --- |
| `web_fetch` | 抓网页正文（去掉导航、广告等噪声），用来查资料、看帖子 |
| `web_bilibili` | 调 B站公开接口，搜视频、看排行榜、取 UP 主投稿等 |

这是**客户端**组件，跟
[cortico-world-astrbot](https://github.com/aldebaranmm/cortico-world-astrbot)
装在一起，两者都靠服务端的
[astrbot_plugin_coop_bridge](https://github.com/aldebaranmm/astrbot_plugin_coop_bridge) 接进 AstrBot 体系。

- 总览 + 完整安装步骤：https://github.com/aldebaranmm/coopanion-astrbot-bridge
- 下载：[cortico-world-web-0.1.0.zip](https://github.com/aldebaranmm/cortico-world-web/releases/download/v0.1.0/cortico-world-web-0.1.0.zip)

---

## 安装

1. 解压，把 `cortico-world-web/` 整个目录放到 Coopanion 的扩展目录下
   （和 `cortico-world-astrbot/` 同级）
2. **重启 Coopanion**

不用填配置 —— 装上就能用，桌宠会在需要时自己调这两个工具。

详细步骤见 → [安装使用说明](https://github.com/aldebaranmm/coopanion-astrbot-bridge/blob/main/docs/%E5%AE%89%E8%A3%85%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.md)

---

## 说明

- 请求会带正常浏览器 UA 和中文 `Accept-Language`，否则部分站点返回空或错版
- `web_bilibili` 走的是 B站公开接口，不需要登录
- 抓网页只取正文，不做任何写入操作

---

## 许可与商用限制

作者：**Kaiser**

### ✅ 可以自由使用

- 个人自用、学习研究
- 非营利的修改与二次分发（须保留署名和本声明）

### ❌ 未经书面授权，禁止任何形式的商业使用

包括但不限于：

- 打包进收费产品或服务出售
- 用于经营性业务（付费机器人、商业客服、企业内部系统等）
- 二次分发收费，或去除/篡改署名后转售
- 作为付费部署、代搭建服务的一部分提供

### 商业授权

确有商业使用需求的，请联系作者取得 **书面授权**。

### 📮 联系方式

有问题、建议、bug 反馈，或需要商业授权，都欢迎联系作者：

- **QQ 邮箱：2760546027@qq.com**

（作者即本项目的 QQ 机器人使用者，反馈时说明一下你用的是哪个组件、版本号，会更快定位。）

### 法律声明

对未经授权的商业使用，作者 **保留一切追诉权利**，
包括但不限于要求立即停止侵害、消除影响、赔偿损失，以及提起诉讼。

---

代码许可以仓库根目录的 [LICENSE](LICENSE) 文件为准：**PolyForm Noncommercial License 1.0.0**
（源码公开可读、可改、可分发，但**仅限非商业用途**）。
商业使用须另行取得作者的书面许可，联系方式见上。
