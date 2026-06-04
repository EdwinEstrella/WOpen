import { NextResponse } from "next/server";
import {
	createWhatsAppInstance,
	listWhatsAppInstances,
} from "../../../lib/db.ts";
import { getSoftRestartFlagPath, runtimePaths } from "../../../lib/runtime-paths.ts";
import fs from "node:fs";

function requestBotRestart() {
	if (!fs.existsSync(runtimePaths.dataDir)) fs.mkdirSync(runtimePaths.dataDir, { recursive: true });
	fs.writeFileSync(getSoftRestartFlagPath(), "");
}

export async function GET() {
	try {
		return NextResponse.json(await listWhatsAppInstances());
	} catch (error: any) {
		console.error("[api] Error en GET /api/instances:", error);
		return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}));
		const name = typeof body.name === "string" ? body.name : "";
		const instance = await createWhatsAppInstance(name);
		requestBotRestart();
		return NextResponse.json(instance, { status: 201 });
	} catch (error: any) {
		console.error("[api] Error en POST /api/instances:", error);
		const status = error.message === "instance_name_required" ? 400 : 500;
		return NextResponse.json({ error: "Could not create instance", message: error.message }, { status });
	}
}
