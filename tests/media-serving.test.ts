import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { GET } from "../src/app/media/[filename]/route.ts";
import { runtimePaths } from "../src/lib/runtime-paths.ts";

const mediaDir = runtimePaths.mediaDir;
const testFile = "voice-note-contract.ogg";
const testPath = path.join(mediaDir, testFile);

after(() => {
	fs.rmSync(testPath, { force: true });
});

describe("WhatsApp media serving", () => {
	it("serves runtime audio files from the media storage directory", async () => {
		fs.mkdirSync(mediaDir, { recursive: true });
		fs.writeFileSync(testPath, Buffer.from("OggS contract audio"));

		const response = await GET(new Request("http://localhost/media/" + testFile), {
			params: Promise.resolve({ filename: testFile }),
		});

		assert.equal(response.status, 200);
		assert.equal(response.headers.get("content-type"), "audio/ogg");
		assert.equal(await response.text(), "OggS contract audio");
	});

	it("rejects unsafe media filenames instead of reading arbitrary files", async () => {
		const response = await GET(new Request("http://localhost/media/..%2F.env"), {
			params: Promise.resolve({ filename: "../.env" }),
		});

		assert.equal(response.status, 400);
	});
});
