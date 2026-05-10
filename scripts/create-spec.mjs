#!/usr/bin/env node

import path from "node:path";
import {
	createSpecFromJsonFile,
	getProjectRoot,
} from "./spec-utils.mjs";

const usage = `
Usage:
  npm run create:spec -- <input.json>

Example:
  npm run create:spec -- scripts/spec-template.json
`;

const inputPath = process.argv[2];

if (!inputPath) {
	console.error(usage.trim());
	process.exit(1);
}

const projectRoot = getProjectRoot();
const resolvedInputPath = path.resolve(projectRoot, inputPath);
const result = createSpecFromJsonFile(resolvedInputPath);

console.log(`Created spec: ${path.relative(projectRoot, result.outputPath)}`);
console.log(`Registered in: ${path.relative(projectRoot, result.indexPath)}`);
console.log(`Composition id: ${result.input.compositionId}`);
