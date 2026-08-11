/** Minimal Obsidian API stubs for unit tests. */

export function normalizePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

export class TFile {
	path: string;
	extension: string;
	constructor(path: string) {
		this.path = path;
		this.extension = path.split(".").pop() ?? "";
	}
}

export class TFolder {
	path: string;
	constructor(path: string) {
		this.path = path;
	}
}

export class Notice {
	constructor(_message: string) {}
}
