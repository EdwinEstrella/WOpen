import fs from "node:fs";
import path from "node:path";

import type { MessageRow } from "./db-contract.ts";
import { runtimePaths } from "./runtime-paths.ts";

function filenameFromMediaUrl(mediaUrl: unknown): string | null {
	if (typeof mediaUrl !== "string") return null;
	const match = mediaUrl.match(/^\/media\/([a-zA-Z0-9._-]+)$/);
	return match?.[1] ?? null;
}

function mediaFileExists(filename: string): boolean {
	const candidates = [
		path.join(runtimePaths.mediaDir, filename),
		path.join(/* turbopackIgnore: true */ process.cwd(), "public", "media", filename),
	];

	return candidates.some((candidate) => {
		try {
			return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
		} catch {
			return false;
		}
	});
}

export function withMediaAvailability<T extends MessageRow>(messages: T[]): T[] {
	return messages.map((message) => {
		if (message.media_type !== "audio" && message.media_type !== "image") {
			return message;
		}

		const filename = filenameFromMediaUrl(message.metadata.mediaUrl);
		if (!filename) return message;

		return {
			...message,
			metadata: {
				...message.metadata,
				mediaAvailable: mediaFileExists(filename),
			},
		};
	});
}
