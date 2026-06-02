import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { setConnectionState } from "../../../../lib/db.ts";

export async function POST() {
	try {
		console.log("[api] Petición de desconexión manual recibida.");
		
		// 1. Limpiamos el estado de conexión en la base de datos
		await setConnectionState({
			status: "disconnected",
			qr_string: null,
			phone: null,
		});

		const authDir = path.resolve(process.cwd(), "auth");
		const restartFlagPath = path.resolve(process.cwd(), "data", ".restart");
		const dataDir = path.resolve(process.cwd(), "data");

		// 2. Borramos la carpeta auth/
		if (fs.existsSync(authDir)) {
			fs.rmSync(authDir, { recursive: true, force: true });
			console.log("[api] Directorio auth/ eliminado.");
		}

		// Aseguramos que la carpeta data/ existe
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}

		// 3. Escribimos la bandera de reinicio
		fs.writeFileSync(restartFlagPath, "");
		console.log("[api] Bandera .restart creada con éxito.");

		return NextResponse.json({ ok: true, message: "Disconnecting and resetting auth session..." });
	} catch (error: any) {
		console.error("[api] Error en POST /api/connection/disconnect:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}
