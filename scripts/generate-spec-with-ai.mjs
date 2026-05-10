#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
	generateAiPackage,
	hasUsableInput,
	parseGeneratorInput,
	saveAiPackage,
} from "./ai-spec-lib.mjs";
import { getProjectRoot } from "./spec-utils.mjs";

const usage = `
Usage:
  npm run generate:spec:ai -- "<topic or requirements>"
  npm run generate:spec:ai -- --input prompt.txt
  npm run generate:spec:ai -- --topic "鱼油误区" --audience "新手" --tone "专业但不板" --must-include "保健品不是药"

Environment:
  AI_PROVIDER=deepseek
  DEEPSEEK_API_KEY=...
  DEEPSEEK_MODEL=deepseek-v4-flash
  DEEPSEEK_BASE_URL=https://api.deepseek.com
`;

const cliArgs = process.argv.slice(2);
const projectRoot = getProjectRoot();

try {
	const parsed = parseCliArgs(cliArgs);
	const parsedInput = parseGeneratorInput(parsed);

	if (!hasUsableInput(parsedInput)) {
		console.error(usage.trim());
		process.exit(1);
	}

	const aiPackage = await generateAiPackage({
		parsedInput,
		projectRoot,
	});

	const saveResult = saveAiPackage({
		aiPackage,
		projectRoot,
	});

	console.log(`AI provider: ${aiPackage.provider}`);
	console.log(`Model: ${aiPackage.model}`);
	console.log(`Saved brief: ${path.relative(projectRoot, saveResult.briefOutputPath)}`);
	console.log(`Saved JSON: ${path.relative(projectRoot, saveResult.jsonOutputPath)}`);
	console.log(
		`Created spec: ${path.relative(projectRoot, saveResult.specResult.outputPath)}`,
	);
	console.log(
		`Registered in: ${path.relative(projectRoot, saveResult.specResult.indexPath)}`,
	);
	console.log(`Composition id: ${aiPackage.spec.compositionId}`);
} catch (error) {
	console.error(error instanceof Error ? error.message : "Unknown error");
	process.exit(1);
}

function parseCliArgs(args) {
	const parsedArgs = {
		freeTextParts: [],
		mustInclude: [],
		avoid: [],
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (!arg.startsWith("--")) {
			parsedArgs.freeTextParts.push(arg);
			continue;
		}

		const nextValue = args[index + 1];
		const takeNextValue = () => {
			if (!nextValue || nextValue.startsWith("--")) {
				throw new Error(`Missing value for ${arg}`);
			}
			index += 1;
			return nextValue;
		};

		switch (arg) {
			case "--input":
				parsedArgs.promptFromFile = takeNextValue();
				break;
			case "--topic":
				parsedArgs.topic = takeNextValue();
				break;
			case "--audience":
				parsedArgs.audience = takeNextValue();
				break;
			case "--platform":
				parsedArgs.platform = takeNextValue();
				break;
			case "--tone":
				parsedArgs.tone = takeNextValue();
				break;
			case "--goal":
				parsedArgs.goal = takeNextValue();
				break;
			case "--must-include":
				parsedArgs.mustInclude.push(takeNextValue());
				break;
			case "--avoid":
				parsedArgs.avoid.push(takeNextValue());
				break;
			case "--provider":
				parsedArgs.provider = takeNextValue();
				break;
			case "--model":
				parsedArgs.model = takeNextValue();
				break;
			default:
				throw new Error(`Unknown argument: ${arg}`);
		}
	}

	if (parsedArgs.promptFromFile) {
		const resolvedPath = path.resolve(projectRoot, parsedArgs.promptFromFile);
		parsedArgs.prompt = fs.readFileSync(resolvedPath, "utf8");
	}

	if (!parsedArgs.prompt) {
		parsedArgs.prompt = parsedArgs.freeTextParts.join(" ").trim();
	}

	return parsedArgs;
}
