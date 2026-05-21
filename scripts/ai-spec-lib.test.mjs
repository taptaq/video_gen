import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRequestContext,
  generateAiPackage,
  ideateAiDirections,
  parseGeneratorInput,
} from "/Users/taptaq/Documents/Original Heart Road/project/video_gen/scripts/ai-spec-lib.mjs";

const originalFetch = globalThis.fetch;
const originalEnv = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
};

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv(originalEnv);
});

test("defaults generator mode to long-copy in parsed input and request context", () => {
  const parsedInput = parseGeneratorInput({ prompt: "  讲解一下  ", topic: "  主题  " });
  const requestContext = buildRequestContext(parsedInput);

  assert.equal(parsedInput.mode, "long-copy");
  assert.equal(requestContext.mode, "long-copy");
});

test("keeps the structured branch distinct from the long-copy branch for ideation and spec generation", async () => {
  process.env.AI_PROVIDER = "deepseek";
  process.env.DEEPSEEK_API_KEY = "test-key";
  process.env.DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  process.env.DEEPSEEK_MODEL = "test-model";

  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ directions: [], spec: {}, brief: {}, assumptions: [] }),
            },
          },
        ],
      }),
    };
  };

  await ideateAiDirections({
    parsedInput: parseGeneratorInput({
      prompt: "原始主题说明",
      topic: "主题 A",
      audience: "学生",
    }),
  });

  await generateAiPackage({
    parsedInput: parseGeneratorInput({
      prompt: "原始主题说明",
      topic: "主题 A",
      audience: "学生",
    }),
  });

  await ideateAiDirections({
    parsedInput: parseGeneratorInput({
      prompt: "原始主题说明",
      topic: "主题 A",
      audience: "学生",
      mode: "structured",
    }),
  });

  await generateAiPackage({
    parsedInput: parseGeneratorInput({
      prompt: "原始主题说明",
      topic: "主题 A",
      audience: "学生",
      mode: "structured",
    }),
  });

  assert.equal(calls.length, 4);
  const [ideationLongCopy, specLongCopy, ideationStructured, specStructured] = calls;

  assert.match(ideationLongCopy.messages[0].content, /先从原始提示里提炼结构/);
  assert.match(specLongCopy.messages[0].content, /先从原始提示里提炼结构/);
  assert.doesNotMatch(ideationLongCopy.messages[0].content, /主约束/);
  assert.doesNotMatch(specLongCopy.messages[0].content, /主约束/);

  assert.match(ideationStructured.messages[0].content, /请把结构化字段当作主约束/);
  assert.match(specStructured.messages[0].content, /请把结构化字段当作主约束/);
  assert.doesNotMatch(ideationStructured.messages[0].content, /先从原始提示/);
  assert.doesNotMatch(specStructured.messages[0].content, /先从原始提示/);

  assert.notEqual(ideationLongCopy.messages[0].content, ideationStructured.messages[0].content);
  assert.notEqual(specLongCopy.messages[0].content, specStructured.messages[0].content);
});

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
