import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["test/**/*.test.ts"],
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, "test/obsidian-mock.ts"),
		},
	},
});
