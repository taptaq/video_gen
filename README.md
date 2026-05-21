# Remotion 视频项目

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Remotion 动画标志" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

欢迎使用这个 Remotion 项目。

## 常用命令

**安装依赖**

```console
npm i
```

**启动统一工作台**

```console
npm run dev
```

这会同时启动 AI 规格工作台，并把 Remotion 预览挂载到同一个本地域名下。
开发时，`npm run dev` 还会自动监听 `tools/spec-studio/public/`、`scripts/`、`src/` 和 `package.json` 的改动，并在浏览器里自动刷新。

**只启动 Remotion 预览**

```console
npm run studio
```

**渲染视频**

```console
npx remotion render
```

**升级 Remotion**

```console
npx remotion upgrade
```

## AI 规格模式

AI 规格生成器支持两种模式：

- `long-copy`：适合直接粘贴完整文案、长需求或已经写好的草稿，让 CLI 先把它当成原始文本来理解。
- `structured`：适合你已经知道主题、受众、平台、语气、目标等字段时，直接按结构化信息填写。

两种模式最终都会产出同一种 Remotion 规格结构，所以后面的渲染流程不会变化。

示例：

```console
npm run generate:spec:ai -- --mode long-copy "做一个关于褪黑素误区的 9:16 抖音科普视频，风格专业但别太板"
```

```console
npm run generate:spec:ai -- --mode structured --topic "鱼油误区" --audience "新手" --platform "抖音" --tone "专业但不板" --goal "澄清常见误区" --must-include "保健品不是药"
```

## 文档

如果你想先了解 Remotion 基础，可以看 [官方入门文档](https://www.remotion.dev/docs/the-fundamentals)。

## 帮助

你可以在 [Discord 社区](https://discord.gg/6VzzNDwUwV) 获取帮助。

## 问题反馈

如果你在 Remotion 上遇到问题，可以到 [这里提交 issue](https://github.com/remotion-dev/remotion/issues/new)。

## 许可

某些场景可能需要公司许可证，详情请看 [条款说明](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
