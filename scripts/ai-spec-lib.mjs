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
	const mode = normalizeMode(input.mode);

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
		mode,
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
		mode: parsedInput.mode ?? "long-copy",
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
		systemPrompt: buildIdeationSystemPrompt(requestContext.mode),
		userPrompt: buildIdeationUserPrompt(requestContext, requestContext.mode),
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
		systemPrompt: buildSpecSystemPrompt(requestContext.mode),
		userPrompt: buildSpecUserPrompt(requestContext, requestContext.mode),
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

function buildSpecSystemPrompt(mode = "long-copy") {
	const instructions =
		mode === "structured"
			? [
					"你正在为一个 Remotion 知识类视频模板生成创作概要和结构化 JSON。",
					"请把结构化字段当作主约束。",
					"当结构化字段和原始提示不一致时，请优先遵循结构化字段，只用原始提示补齐缺口。",
					"只返回有效 JSON。",
					"不要把 JSON 包在 markdown 代码块里。",
					"请生成适合 9:16 竖屏知识短视频的简洁中文文案。",
			  ]
			: [
					"你正在为一个 Remotion 知识类视频模板生成创作概要和结构化 JSON。",
					"请先从原始提示里提炼结构，再去对照结构化提示进行修正。",
					"当原始提示存在时，请把它当作主要意图来源。",
					"只返回有效 JSON。",
					"不要把 JSON 包在 markdown 代码块里。",
					"请生成适合 9:16 竖屏知识短视频的简洁中文文案。",
			  ];

	return [
		...instructions,
		"请严格遵循以下顶层结构：",
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
		"要求：",
		"- id 必须是 kebab-case ASCII。",
		"- compositionId 必须是 PascalCase ASCII。",
		"- 即使用户只给一两句话，创作概要也必须可读、可用。",
		"- 如果用户输入比较稀疏，请补全合理假设，并把它们列在 assumptions 里。",
		"- tickerItems 至少 3 条，insight points 至少 3 条，timeline milestones 至少 3 条，comparison items 至少 3 条，checklist tips 至少 4 条，outro nextSteps 至少 2 条。",
		"- 文案要务实、具体，适合知识类短视频口播。",
		"- 除非明确作为泛知识表达，不要写医疗、法律或金融结论。",
	].join("\n");
}

function buildSpecUserPrompt(requestContext, mode = "long-copy") {
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
		mode === "structured"
			? "请为下面的视频需求生成一个完整 JSON 对象。"
			: "请先从原始提示中提炼结构，再结合提示信息生成一个完整 JSON 对象。",
		mode === "structured"
			? "结构化字段是主约束；请优先使用它们，把原始提示当作辅助背景。"
			: "如果请求信息比较稀疏，请从原始提示中推断出清晰的知识结构，并明确写出你的假设。",
		extraLines ? "\n结构化提示：\n" + extraLines : "",
		"",
		"自然语言请求：",
		requestContext.rawPrompt || "（未提供额外提示，请依赖结构化提示。）",
	].join("\n");
}

function buildIdeationSystemPrompt(mode = "long-copy") {
	const instructions =
		mode === "structured"
			? [
					"你正在帮助在最终脚本生成前，先构思短视频知识内容的方向。",
					"请把结构化字段当作主约束。",
					"只在需要补足缺口或消除歧义时，才使用原始提示。",
					"只返回有效 JSON。",
					"不要把 JSON 包在 markdown 代码块里。",
			  ]
			: [
					"你正在帮助在最终脚本生成前，先构思短视频知识内容的方向。",
					"请先从原始提示里提炼结构，再解释任何辅助信息。",
					"请把结构化字段当作辅助背景，而不是起点。",
					"只返回有效 JSON。",
					"不要把 JSON 包在 markdown 代码块里。",
			  ];

	return [
		...instructions,
		"输出结构：",
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
		"要求：",
		"- 必须返回 3 个方向。",
		"- 3 个方向在切入角度或结构上必须明显不同，不能只是措辞不同。",
		"- 适合中文知识类短视频。",
		"- 如果用户表达比较模糊，请推断出实用方案，并让三个方向清晰区分。",
	].join("\n");
}

function buildIdeationUserPrompt(requestContext, mode = "long-copy") {
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
		mode === "structured"
			? "请为这个需求提出 3 个彼此不同的视频方向。"
			: "请先从原始提示中提炼结构，再结合提示信息提出 3 个彼此不同的视频方向。",
		mode === "structured"
			? "每个方向都应该把结构化字段当作主约束。"
			: "每个方向都应该先保留原始提示的意图，再去解释辅助信息。",
		extraLines ? "\n结构化提示：\n" + extraLines : "",
		"",
		"自然语言请求：",
		requestContext.rawPrompt || "（未提供额外提示，请依赖结构化提示。）",
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

function normalizeMode(value) {
	return value === "structured" ? "structured" : "long-copy";
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
