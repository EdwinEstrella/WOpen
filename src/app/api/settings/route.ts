import { NextResponse } from "next/server";
import { getSettings, setSetting } from "../../../lib/db.ts";

// Obtiene todas las configuraciones actuales
export async function GET() {
	try {
		const settings = await getSettings();
		return NextResponse.json(settings);
	} catch (error: any) {
		console.error("[api] Error en GET /api/settings:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}

// Guarda/actualiza las configuraciones en lote
export async function PUT(req: Request) {
	try {
		const body = await req.json();
		
		if (typeof body !== "object" || body === null) {
			return NextResponse.json({ error: "Invalid body" }, { status: 400 });
		}

		await Promise.all(
			Object.entries(body).map(([key, value]) => setSetting(key, value))
		);

		const updatedSettings = await getSettings();
		return NextResponse.json({ ok: true, settings: updatedSettings });
	} catch (error: any) {
		console.error("[api] Error en PUT /api/settings:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}
