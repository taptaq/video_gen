# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

**Install Dependencies**

```console
npm i
```

**Start Unified App**

```console
npm run dev
```

This now starts the AI spec UI and mounts Remotion Studio under the same local origin.

**Start Only Remotion Studio**

```console
npm run studio
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## AI Spec CLI Modes

The AI spec generator supports two invocation modes:

- `long-copy`: paste a full draft, caption, or requirement block and let the CLI treat it as the source text.
- `structured`: fill in fields like `--topic`, `--audience`, `--platform`, `--tone`, `--goal`, `--must-include`, and `--avoid` when you already know the shape of the request.

Both modes still produce the same Remotion spec shape, so the downstream render flow does not change.

Examples:

```console
npm run generate:spec:ai -- --mode long-copy "做一个关于褪黑素误区的 9:16 抖音科普视频，风格专业但别太板"
```

```console
npm run generate:spec:ai -- --mode structured --topic "鱼油误区" --audience "新手" --platform "抖音" --tone "专业但不板" --goal "澄清常见误区" --must-include "保健品不是药"
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
