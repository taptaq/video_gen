# AI Spec Generation

这个项目现在支持两种方式新增主题视频：

## 1. 手工 JSON 转 spec

```bash
npm run create:spec -- scripts/spec-template.json
```

适合你已经有结构化 JSON 的情况。

## 2. 调用模型自动生成 spec

```bash
export AI_PROVIDER=deepseek
export DEEPSEEK_API_KEY=your_api_key
export DEEPSEEK_MODEL=deepseek-v4-flash

npm run generate:spec:ai -- "做一个关于褪黑素误区的 9:16 抖音科普视频，风格专业但别太板"
```

也可以读取文本文件：

```bash
npm run generate:spec:ai -- --input brief.txt
```

也支持你只给很少的信息，让模型自己补结构：

```bash
npm run generate:spec:ai -- "想做一个关于久坐危害的短视频，别太吓人，要实用一点"
```

或者你不想写整段话，只给几个提示：

```bash
npm run generate:spec:ai -- \
  --topic "鱼油误区" \
  --audience "第一次接触保健品的人" \
  --tone "专业、可信、别太板" \
  --must-include "保健品不是药" \
  --must-include "EPA/DHA 不是越高越好" \
  --avoid "夸张疗效"
```

运行后会：

1. 调用模型先补出一份创作 brief
2. 再生成一个符合模板的 spec JSON
3. 将 brief 保存到 `generated/briefs/`
4. 将原始 JSON 保存到 `generated/specs/`
5. 自动生成 `src/specs/*.ts`
6. 自动更新 `src/specs/index.ts`

## 3. 可视化工作台

启动本地 UI：

```bash
npm run ai:ui
```

默认地址：

```text
http://127.0.0.1:3210
```

在这个页面里，你可以：

- 只输入一句自然语言
- 或者额外补 `topic / audience / tone / must include / avoid`
- 先看模型补出的 brief
- 再看最终 spec JSON
- 确认后点按钮，直接保存进项目

UI 和命令行共用同一套底层逻辑，所以两边生成结果风格是一致的。

## 当前支持的模型提供方

- `deepseek`

默认环境变量：

- `AI_PROVIDER=deepseek`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-v4-flash`

项目会自动读取根目录下的 `.env.local` 和 `.env`。

## 建议的提示词内容

为了让输出更稳定，输入里最好包含这些信息：

- 主题是什么
- 面向谁
- 平台是什么，比如抖音 / 小红书
- 语气，比如专业、克制、犀利、轻松
- 是否有必须包含的事实点
- 是否有要规避的表达

示例：

```text
做一个关于鱼油选购误区的 9:16 抖音知识短视频。
面向第一次接触保健品的人群。
风格要干净、可信、节奏快。
必须包含：EPA/DHA 不是越高越好、保健品不是药、选购时看剂量和场景。
避免夸张疗效和绝对化表达。
```

## 注意

- 生成结果是“高质量草稿”，不是最终事实审校结果。
- 如果你只给一句很短的话，脚本会让模型自己补齐受众、角度、节奏和视觉方向，并把这些假设写进 brief。
- 医疗、法律、金融这类主题建议二次核对内容再发布。
- 如果你后面想接更多模型，可以在 `scripts/generate-spec-with-ai.mjs` 里继续扩 provider。
