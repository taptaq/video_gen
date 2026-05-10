import fs from "node:fs";
import path from "node:path";
import {
	createSpecFromJsonObject,
	getProjectRoot,
	toKebabCase,
} from "./spec-utils.mjs";

export function loadProjectEnv(projectRoot = getProjectRoot()) {
	for (const fileName of [".env.local", ".env"]) {
		const filePath = path.join(projectRoot, fileName);
		if (!fs.existsSync(filePath)) {
			continue;
		}

		const content = fs.readFileSync(filePath, "utf8");
		for (const rawLine of content.split(/\r?\n/)) {
			const line = rawLine.trim();
			if (!line || line.startsWith("#")) {
				continue;
			}

			const separatorIndex = line.indexOf("=");
			if (separatorIndex === -1) {
				continue;
			}

			const key = line.slice(0, separatorIndex).trim();
			const value = stripQuotes(line.slice(separatorIndex + 1).trim());

			if (!(key in process.env)) {
				process.env[key] = value;
			}
		}
	}
}

export function parseGeneratorInput(input) {
	return {
		prompt: typeof input.prompt === "string" ? input.prompt.trim() : "",
		topic: normalizeOptionalString(input.topic),
		audience: normalizeOptionalString(input.audience),
		platform: normalizeOptionalString(input.platform),
		tone: normalizeOptionalString(input.tone),
		goal: normalizeOptionalString(input.goal),
		mustInclude: normalizeStringArray(input.mustInclude),
		avoid: normalizeStringArray(input.avoid),
		provider: normalizeOptionalString(input.provider),
		model: normalizeOptionalString(input.model),
	};
}

export function hasUsableInput(parsedInput) {
	return Boolean(
		parsedInput.prompt ||
			parsedInput.topic ||
			parsedInput.audience ||
			parsedInput.platform ||
			parsedInput.tone ||
			parsedInput.goal ||
			parsedInput.mustInclude.length > 0 ||
			parsedInput.avoid.length > 0,
	);
}

export function buildRequestContext(parsedInput) {
	const promptText = parsedInput.prompt ?? "";
	const slugSource = (parsedInput.topic ?? promptText)
		.split("\n")
		.find((line) => line.trim().length > 0)
		?.slice(0, 48) ?? "ai-generated-spec";

	return {
		rawPrompt: promptText,
		topic: parsedInput.topic,
		audience: parsedInput.audience,
		platform: parsedInput.platform,
		tone: parsedInput.tone,
		goal: parsedInput.goal,
		mustInclude: parsedInput.mustInclude,
		avoid: parsedInput.avoid,
		defaultId: slugSource,
	};
}

export async function ideateAiDirections({
	parsedInput,
	projectRoot = getProjectRoot(),
}) {
	loadProjectEnv(projectRoot);

	const provider = parsedInput.provider ?? process.env.AI_PROVIDER ?? "deepseek";
	if (provider !== "deepseek") {
		throw new Error(`Unsupported AI_PROVIDER: ${provider}. Currently supported: deepseek`);
	}

	const apiKey = process.env.DEEPSEEK_API_KEY;
	if (!apiKey) {
		throw new Error("Missing DEEPSEEK_API_KEY in environment.");
	}

	const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
	const model = parsedInput.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
	const requestContext = buildRequestContext(parsedInput);

	const responseText = await callDeepSeek({
		apiKey,
		baseUrl,
		model,
		systemPrompt: buildIdeationSystemPrompt(),
		userPrompt: buildIdeationUserPrompt(requestContext),
	});

	const payload = extractJsonObject(responseText);
	const directions = Array.isArray(payload.directions) ? payload.directions : [];

	return {
		provider,
		model,
		requestContext,
		directions,
		rawResponse: responseText,
	};
}

export async function generateAiPackage({
	parsedInput,
	projectRoot = getProjectRoot(),
}) {
	loadProjectEnv(projectRoot);

	const provider = parsedInput.provider ?? process.env.AI_PROVIDER ?? "deepseek";
	if (provider !== "deepseek") {
		throw new Error(`Unsupported AI_PROVIDER: ${provider}. Currently supported: deepseek`);
	}

	const apiKey = process.env.DEEPSEEK_API_KEY;
	if (!apiKey) {
		throw new Error("Missing DEEPSEEK_API_KEY in environment.");
	}

	const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
	const model = parsedInput.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
	const requestContext = buildRequestContext(parsedInput);

	const responseText = await callDeepSeek({
		apiKey,
		baseUrl,
		model,
		systemPrompt: buildSpecSystemPrompt(),
		userPrompt: buildSpecUserPrompt(requestContext),
	});

	const payload = extractJsonObject(responseText);
	const spec = payload.spec ?? payload;
	const brief = payload.brief ?? createFallbackBrief(requestContext, spec);
	const assumptions = Array.isArray(payload.assumptions) ? payload.assumptions : [];

	return {
		provider,
		model,
		requestContext,
		brief,
		assumptions,
		spec,
		rawResponse: responseText,
	};
}

export function saveAiPackage({
	aiPackage,
	projectRoot = getProjectRoot(),
}) {
	const { brief, assumptions, model, provider, requestContext, spec } = aiPackage;
	const baseName = toKebabCase(
		spec.id ?? requestContext.defaultId ?? requestContext.topic ?? "ai-generated-spec",
	);
	const generatedSpecsDir = path.join(projectRoot, "generated", "specs");
	const generatedBriefsDir = path.join(projectRoot, "generated", "briefs");
	fs.mkdirSync(generatedSpecsDir, { recursive: true });
	fs.mkdirSync(generatedBriefsDir, { recursive: true });

	const jsonOutputPath = path.join(generatedSpecsDir, `${baseName}.json`);
	const briefOutputPath = path.join(generatedBriefsDir, `${baseName}.md`);
	fs.writeFileSync(jsonOutputPath, `${JSON.stringify(spec, null, 2)}\n`);
	fs.writeFileSync(
		briefOutputPath,
		renderBriefMarkdown({
			requestContext,
			brief,
			assumptions,
			model,
			provider,
		}),
	);

	const specResult = createSpecFromJsonObject(spec);

	return {
		jsonOutputPath,
		briefOutputPath,
		specResult,
	};
}

export function renderBriefMarkdown({
	requestContext,
	brief,
	assumptions,
	model,
	provider,
}) {
	const lines = [
		"# AI Video Brief",
		"",
		`- Provider: ${provider}`,
		`- Model: ${model}`,
		`- Raw request: ${requestContext.rawPrompt || "(empty)"}`,
		"",
		"## Brief",
		"",
		`- Topic: ${brief.topic ?? ""}`,
		`- Audience: ${brief.audience ?? ""}`,
		`- Platform: ${brief.platform ?? ""}`,
		`- Tone: ${brief.tone ?? ""}`,
		`- Hook angle: ${brief.hookAngle ?? ""}`,
		`- Core message: ${brief.coreMessage ?? ""}`,
		`- Visual direction: ${brief.visualDirection ?? ""}`,
		"",
		"## Must Include",
		"",
	];

	for (const item of brief.mustInclude ?? []) {
		lines.push(`- ${item}`);
	}

	if ((brief.mustInclude ?? []).length === 0) {
		lines.push("- None");
	}

	lines.push("", "## Avoid", "");

	for (const item of brief.avoid ?? []) {
		lines.push(`- ${item}`);
	}

	if ((brief.avoid ?? []).length === 0) {
		lines.push("- None");
	}

	lines.push("", "## Assumptions", "");

	for (const item of assumptions) {
		lines.push(`- ${item}`);
	}

	if (assumptions.length === 0) {
		lines.push("- None");
	}

	lines.push("");
	return `${lines.join("\n")}\n`;
}

async function callDeepSeek({
	apiKey,
	baseUrl,
	model,
	systemPrompt,
	userPrompt,
}) {
	const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			response_format: { type: "json_object" },
			thinking: { type: "disabled" },
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: userPrompt,
				},
			],
			max_tokens: 4000,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
	}

	const payload = await response.json();
	const content = payload?.choices?.[0]?.message?.content;

	if (typeof content !== "string" || content.trim().length === 0) {
		throw new Error("DeepSeek API returned empty content.");
	}

	return content;
}

function buildSpecSystemPrompt() {
	return [
		"You are generating both a creative brief and structured JSON for a Remotion knowledge-video template.",
		"Return valid JSON only.",
		"Do not wrap the JSON in markdown fences.",
		"Generate concise, platform-ready Chinese copy for a 9:16 short-form educational video.",
		"Follow this exact top-level shape:",
		"{",
		'  "brief": {',
		'    "topic": "主题",',
		'    "hookAngle": "开场角度",',
		'    "audience": "受众",',
		'    "platform": "平台",',
		'    "tone": "语气",',
		'    "coreMessage": "核心结论",',
		'    "visualDirection": "视觉方向",',
		'    "mustInclude": ["必须包含点"],',
		'    "avoid": ["避免点"]',
		'  },',
		'  "assumptions": ["当用户信息不完整时，你做了哪些合理假设"],',
		'  "spec": {',
		'    "id": "kebab-case-id",',
		'    "compositionId": "PascalCaseId",',
		'    "topic": "主题",',
		'    "tickerItems": ["..."],',
		'    "theme": { "palette": { "bg": "#hex", "panel": "rgba(...)", "cyan": "#hex", "coral": "#hex", "gold": "#hex" } },',
		'    "hook": { "title": "", "subtitle": "", "chips": ["", "", ""], "highlight": { "badge": "", "title": "", "copy": "" }, "stat": { "label": "", "value": "", "note": "" }, "footer": "" },',
		'    "insight": { "title": "", "subtitle": "", "points": [{ "badge": "", "title": "", "copy": "", "accent": "cyan|gold|coral" }], "spotlight": { "badge": "", "title": "", "copy": "", "note": "" } },',
		'    "timeline": { "title": "", "subtitle": "", "milestones": [{ "era": "", "title": "", "copy": "" }] },',
		'    "comparison": { "title": "", "subtitle": "", "items": [{ "name": "", "tag": "", "accent": "cyan|gold|coral", "pros": "", "cons": "" }] },',
		'    "checklist": { "title": "", "subtitle": "", "tips": [{ "kicker": "", "title": "", "copy": "" }], "callout": { "badge": "", "title": "", "copy": "" } },',
		'    "outro": { "title": "", "subtitle": "", "summary": "", "copy": "", "nextSteps": [{ "label": "", "copy": "" }] }',
		"  }",
		"}",
		"Requirements:",
		"- id must be kebab-case ASCII.",
		"- compositionId must be PascalCase ASCII.",
		"- The brief must be readable and useful even when the user only gave one or two sentences.",
		"- If the user input is sparse, fill gaps with sensible assumptions and list them in assumptions.",
		"- Produce 3 tickerItems minimum, 3 insight points, 3 timeline milestones, 3 comparison items, 4 checklist tips, 2 outro nextSteps.",
		"- Keep the writing practical, specific, and suitable for knowledge-style short video narration.",
		"- Avoid medical, legal, or financial claims unless clearly framed as general education.",
	].join("\n");
}

function buildSpecUserPrompt(requestContext) {
	const extraLines = [
		requestContext.topic ? `- topic: ${requestContext.topic}` : null,
		requestContext.audience ? `- audience: ${requestContext.audience}` : null,
		requestContext.platform ? `- platform: ${requestContext.platform}` : null,
		requestContext.tone ? `- tone: ${requestContext.tone}` : null,
		requestContext.goal ? `- goal: ${requestContext.goal}` : null,
		requestContext.mustInclude?.length
			? `- mustInclude: ${requestContext.mustInclude.join(" / ")}`
			: null,
		requestContext.avoid?.length ? `- avoid: ${requestContext.avoid.join(" / ")}` : null,
	]
		.filter(Boolean)
		.join("\n");

	return [
		"Generate one complete JSON object for the following video request.",
		"If the request is sparse, infer a strong educational structure and clearly surface your assumptions.",
		extraLines ? "\nStructured hints:\n" + extraLines : "",
		"",
		"Natural-language request:",
		requestContext.rawPrompt || "(No extra prompt provided. Rely on the structured hints.)",
	].join("\n");
}

function buildIdeationSystemPrompt() {
	return [
		"You are helping ideate short-form knowledge video directions before final script generation.",
		"Return valid JSON only.",
		"Do not wrap the JSON in markdown fences.",
		"Output shape:",
		"{",
		'  "directions": [',
		"    {",
		'      "id": "direction-1",',
		'      "name": "方向名称",',
		'      "tagline": "一句话方向说明",',
		'      "topic": "主题",',
		'      "audience": "受众",',
		'      "platform": "平台",',
		'      "tone": "语气",',
		'      "goal": "想让观众带走什么",',
		'      "hookAngle": "开场抓手",',
		'      "coreMessage": "核心结论",',
		'      "visualDirection": "视觉方向",',
		'      "mustInclude": ["必须讲的点"],',
		'      "avoid": ["需要避免的表达"],',
		'      "seedPrompt": "后续用来生成 spec 的强化提示" ',
		"    }",
		"  ]",
		"}",
		"Requirements:",
		"- Return exactly 3 directions.",
		"- The 3 directions must differ meaningfully in angle or structure, not just wording.",
		"- Fit Chinese short-form knowledge videos.",
		"- If the user is vague, infer practical options and make them clearly distinct.",
	].join("\n");
}

function buildIdeationUserPrompt(requestContext) {
	const extraLines = [
		requestContext.topic ? `- topic: ${requestContext.topic}` : null,
		requestContext.audience ? `- audience: ${requestContext.audience}` : null,
		requestContext.platform ? `- platform: ${requestContext.platform}` : null,
		requestContext.tone ? `- tone: ${requestContext.tone}` : null,
		requestContext.goal ? `- goal: ${requestContext.goal}` : null,
		requestContext.mustInclude?.length
			? `- mustInclude: ${requestContext.mustInclude.join(" / ")}`
			: null,
		requestContext.avoid?.length ? `- avoid: ${requestContext.avoid.join(" / ")}` : null,
	]
		.filter(Boolean)
		.join("\n");

	return [
		"Please propose 3 distinct video directions for this request.",
		"Each direction should be usable as the basis for a full knowledge-video spec.",
		extraLines ? "\nStructured hints:\n" + extraLines : "",
		"",
		"Natural-language request:",
		requestContext.rawPrompt || "(No extra prompt provided. Rely on the structured hints.)",
	].join("\n");
}

function extractJsonObject(content) {
	try {
		return JSON.parse(content);
	} catch {
		const start = content.indexOf("{");
		const end = content.lastIndexOf("}");
		if (start === -1 || end === -1 || end <= start) {
			throw new Error("Model response did not contain a parseable JSON object.");
		}
		return JSON.parse(content.slice(start, end + 1));
	}
}

function createFallbackBrief(requestContext, specObject) {
	return {
		topic: specObject.topic ?? requestContext.topic ?? "未命名主题",
		hookAngle: specObject.hook?.title ?? "先破误区，再给判断框架",
		audience: requestContext.audience ?? "泛知识短视频观众",
		platform: requestContext.platform ?? "抖音 / 小红书 9:16 竖屏",
		tone: requestContext.tone ?? "专业、清楚、节奏快",
		coreMessage: specObject.outro?.summary ?? specObject.insight?.spotlight?.title ?? "",
		visualDirection: "编辑感强的知识卡片、渐变高光、竖屏信息流节奏",
		mustInclude: requestContext.mustInclude ?? [],
		avoid: requestContext.avoid ?? [],
	};
}

function normalizeOptionalString(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStringArray(value) {
	if (!value) {
		return [];
	}

	if (Array.isArray(value)) {
		return value
			.map((item) => (typeof item === "string" ? item.trim() : ""))
			.filter(Boolean);
	}

	if (typeof value === "string") {
		return value
			.split(/\r?\n|,|，|;/)
			.map((item) => item.trim())
			.filter(Boolean);
	}

	return [];
}

function stripQuotes(value) {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}

	return value;
}
