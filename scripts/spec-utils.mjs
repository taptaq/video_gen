import fs from "node:fs";
import path from "node:path";

export function getProjectRoot() {
	return process.cwd();
}

export function getSpecsDir(projectRoot = getProjectRoot()) {
	return path.join(projectRoot, "src", "specs");
}

export function getIndexPath(projectRoot = getProjectRoot()) {
	return path.join(getSpecsDir(projectRoot), "index.ts");
}

export function createSpecFromJsonFile(inputPath) {
	if (!fs.existsSync(inputPath)) {
		throw new Error(`Input file not found: ${inputPath}`);
	}

	const rawInput = fs.readFileSync(inputPath, "utf8");
	return createSpecFromJsonObject(JSON.parse(rawInput));
}

export function createSpecFromJsonObject(input) {
	validateInput(input);

	const projectRoot = getProjectRoot();
	const specsDir = getSpecsDir(projectRoot);
	const indexPath = getIndexPath(projectRoot);
	const fileName = `${toKebabCase(input.id)}.ts`;
	const exportName = `${toCamelCase(input.id)}Spec`;
	const outputPath = path.join(specsDir, fileName);

	const fileContents = `import { createPortraitEducationSpec } from "../spec-builder";

export const ${exportName} = createPortraitEducationSpec(${toTsLiteral(input)});
`;

	fs.mkdirSync(specsDir, { recursive: true });
	fs.writeFileSync(outputPath, fileContents);

	updateSpecsIndex({
		indexPath,
		fileName,
		exportName,
	});

	return {
		projectRoot,
		indexPath,
		outputPath,
		exportName,
		input,
	};
}

export function validateInput(input) {
	assertString(input?.id, "id");
	assertString(input?.compositionId, "compositionId");
	assertString(input?.topic, "topic");

	for (const section of [
		"hook",
		"insight",
		"timeline",
		"comparison",
		"checklist",
		"outro",
	]) {
		if (!input[section] || typeof input[section] !== "object") {
			throw new Error(`Missing required section: ${section}`);
		}
	}
}

export function assertString(value, fieldName) {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`Field "${fieldName}" must be a non-empty string.`);
	}
}

export function toKebabCase(value) {
	return String(value)
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.toLowerCase();
}

export function toCamelCase(value) {
	const normalized = toKebabCase(value);
	return normalized.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

export function toTsLiteral(value, indentLevel = 0) {
	const indent = "\t".repeat(indentLevel);
	const nestedIndent = "\t".repeat(indentLevel + 1);

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "[]";
		}

		const items = value
			.map((item) => `${nestedIndent}${toTsLiteral(item, indentLevel + 1)}`)
			.join(",\n");

		return `[\n${items}\n${indent}]`;
	}

	if (value && typeof value === "object") {
		const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);

		if (entries.length === 0) {
			return "{}";
		}

		const items = entries
			.map(([key, entryValue]) => {
				const formattedKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
					? key
					: JSON.stringify(key);
				return `${nestedIndent}${formattedKey}: ${toTsLiteral(entryValue, indentLevel + 1)}`;
			})
			.join(",\n");

		return `{\n${items}\n${indent}}`;
	}

	return JSON.stringify(value);
}

export function updateSpecsIndex({ indexPath, fileName, exportName }) {
	const importPath = `./${fileName.replace(/\.ts$/, "")}`;
	const importLine = `import { ${exportName} } from "${importPath}";`;

	if (!fs.existsSync(indexPath)) {
		fs.writeFileSync(
			indexPath,
			`${importLine}\n\nexport const videoSpecs = [${exportName}];\n`,
		);
		return;
	}

	const current = fs.readFileSync(indexPath, "utf8");
	const lines = current
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const importLines = lines.filter((line) => line.startsWith("import "));
	const imports = Array.from(new Set([...importLines, importLine])).sort();

	const match = current.match(/export const videoSpecs = \[(.*?)\];/s);
	const currentExports = match
		? match[1]
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean)
		: [];
	const exportsList = Array.from(new Set([...currentExports, exportName])).sort();

	const nextContents = `${imports.join("\n")}\n\nexport const videoSpecs = [${exportsList.join(", ")}];\n`;
	fs.writeFileSync(indexPath, nextContents);
}
