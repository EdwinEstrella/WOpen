import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function readProjectFile(filePath: string): string {
	return readFileSync(path.join(root, filePath), "utf8");
}

function readJson<T>(filePath: string): T {
	return JSON.parse(readProjectFile(filePath)) as T;
}

describe("shadcn/ui redesign foundation contract", () => {
	it("declares a Tailwind v4 shadcn configuration with app aliases", () => {
		const config = readJson<{
			rsc: boolean;
			tsx: boolean;
			tailwind: {
				config: string;
				css: string;
				baseColor: string;
				cssVariables: boolean;
			};
			aliases: Record<string, string>;
		}>("components.json");

		assert.equal(config.rsc, true);
		assert.equal(config.tsx, true);
		assert.equal(config.tailwind.config, "");
		assert.equal(config.tailwind.css, "src/app/globals.css");
		assert.equal(config.tailwind.baseColor, "neutral");
		assert.equal(config.tailwind.cssVariables, true);
		assert.deepEqual(config.aliases, {
			components: "@/components",
			hooks: "@/hooks",
			lib: "@/lib",
			ui: "@/components/ui",
			utils: "@/lib/utils",
		});
	});

	it("configures the @/* TypeScript import alias", () => {
		const tsconfig = readJson<{
			compilerOptions: { baseUrl?: string; paths?: Record<string, string[]> };
		}>("tsconfig.json");

		assert.equal(tsconfig.compilerOptions.baseUrl, ".");
		assert.deepEqual(tsconfig.compilerOptions.paths?.["@/*"], ["./src/*"]);
	});

	it("provides the shadcn class name utility", () => {
		const utils = readProjectFile("src/lib/utils.ts");

		assert.match(utils, /from "clsx"/);
		assert.match(utils, /from "tailwind-merge"/);
		assert.match(utils, /export function cn/);
		assert.match(utils, /twMerge\(clsx\(inputs\)\)/);
	});

	it("wraps the app with a reduced-motion-aware MotionProvider", () => {
		const provider = readProjectFile("src/components/MotionProvider.tsx");
		const layout = readProjectFile("src/app/layout.tsx");

		assert.match(provider, /^"use client";/);
		assert.match(provider, /import \{ MotionConfig \} from "framer-motion"/);
		assert.match(provider, /reducedMotion="user"/);
		assert.match(layout, /import \{ MotionProvider \} from "@\/components\/MotionProvider"/);
		assert.match(layout, /<MotionProvider>\s*\{children\}\s*<\/MotionProvider>/);
		assert.match(layout, /<html lang="es">/);
	});

	it("creates the selected shadcn primitives for the first redesign slice", () => {
		const requiredFiles = [
			"src/components/ui/avatar.tsx",
			"src/components/ui/badge.tsx",
			"src/components/ui/button.tsx",
			"src/components/ui/card.tsx",
			"src/components/ui/dialog.tsx",
			"src/components/ui/input.tsx",
			"src/components/ui/scroll-area.tsx",
			"src/components/ui/separator.tsx",
			"src/components/ui/sheet.tsx",
			"src/components/ui/skeleton.tsx",
			"src/components/ui/tabs.tsx",
			"src/components/ui/textarea.tsx",
		];

		for (const filePath of requiredFiles) {
			assert.equal(existsSync(path.join(root, filePath)), true, filePath);
		}
	});
});
