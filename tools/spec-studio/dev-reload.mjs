import fs from "node:fs";
import path from "node:path";

const debounceMs = 50;

export function createDevReloadBroadcaster({ watchPaths }) {
	const clients = new Set();
	const normalizedWatchPaths = watchPaths.map((watchPath) => path.resolve(watchPath));
	let debounceTimer = null;
	let pendingChange = null;

	return {
		connect(client) {
			clients.add(client);
			return {
				close() {
					clients.delete(client);
				},
			};
		},
		emitChange(changedPath) {
			const normalizedChangedPath = path.resolve(changedPath);
			if (!isWatchedPath(normalizedChangedPath, normalizedWatchPaths)) {
				return;
			}

			if (!isRelevantDevFile(normalizedChangedPath)) {
				return;
			}

			pendingChange = normalizedChangedPath;
			queueReload();
		},
		close() {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}

			pendingChange = null;
			clients.clear();
		},
	};

	function queueReload() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			if (!pendingChange) {
				return;
			}

			for (const client of clients) {
				client.send("reload", pendingChange);
			}
			pendingChange = null;
		}, debounceMs);
	}
}

export function createDevReloadWatcher({ watchPaths, onChange }) {
	const watchers = [];
	const seenDirs = new Set();

	for (const watchPath of watchPaths) {
		const resolvedPath = path.resolve(watchPath);
		const stats = fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath) : null;

		if (stats?.isDirectory()) {
			walkDirectories(resolvedPath, (directoryPath) => {
				if (seenDirs.has(directoryPath)) {
					return;
				}

				seenDirs.add(directoryPath);
				watchers.push(
					fs.watch(directoryPath, { persistent: true }, (eventType, fileName) => {
						const changedPath = fileName
							? path.join(directoryPath, String(fileName))
							: directoryPath;
						onChange(changedPath, eventType);
					}),
				);
			});
			continue;
		}

		const parentDir = path.dirname(resolvedPath);
		if (seenDirs.has(parentDir)) {
			continue;
		}

		seenDirs.add(parentDir);
		watchers.push(
			fs.watch(parentDir, { persistent: true }, (eventType, fileName) => {
				const changedPath = fileName ? path.join(parentDir, String(fileName)) : resolvedPath;
				onChange(changedPath, eventType);
			}),
		);
	}

	return {
		close() {
			for (const watcher of watchers) {
				watcher.close();
			}
		},
	};
}

function walkDirectories(rootDir, visit) {
	visit(rootDir);

	for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue;
		}

		walkDirectories(path.join(rootDir, entry.name), visit);
	}
}

function isWatchedPath(changedPath, watchPaths) {
	return watchPaths.some((watchPath) => {
		return changedPath === watchPath || changedPath.startsWith(`${watchPath}${path.sep}`);
	});
}

function isRelevantDevFile(changedPath) {
	const baseName = path.basename(changedPath);
	if (!baseName || baseName.startsWith(".")) {
		return false;
	}

	const ext = path.extname(baseName);
	if (ext === ".tmp" || ext === ".swp" || ext === ".swo" || ext === ".log") {
		return false;
	}

	return [
		".js",
		".mjs",
		".ts",
		".tsx",
		".css",
		".html",
		".json",
		"",
	].includes(ext);
}
