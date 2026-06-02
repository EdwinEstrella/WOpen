// scripts/env-loader.ts DEBE ser el primer import para popular process.env antes de que otros módulos lo lean
import "./env-loader.ts";
import fs from "node:fs";
import path from "node:path";
import { startWASocket, shutdownWASocket } from "../src/lib/baileys/client.ts";
import { startFollowupsCron } from "./followups-cron.ts";

const restartFlagPath = path.resolve(process.cwd(), "data", ".restart");
const authDir = path.resolve(process.cwd(), "auth");

async function main() {
	console.log("[bot-process] Arrancando bot-process...");
	
	// Iniciamos el socket de Baileys
	await startWASocket();
	
	// Levantamos la tarea programada de follow-ups
	startFollowupsCron();

	// Loop de polling para la desconexión / reinicio manual controlado desde el frontend
	setInterval(async () => {
		if (fs.existsSync(restartFlagPath)) {
			console.log("[bot-process] Bandera .restart detectada. Cerrando sesión de WhatsApp y reiniciando...");
			try {
				// Borramos la bandera
				fs.unlinkSync(restartFlagPath);
				
				// Apagamos el socket actual limpiando listeners
				await shutdownWASocket();
				
				// Borramos la carpeta de sesión local auth/ como defensa
				if (fs.existsSync(authDir)) {
					fs.rmSync(authDir, { recursive: true, force: true });
					console.log("[bot-process] Carpeta auth/ eliminada con éxito.");
				}
				
				// Volvemos a arrancar limpio, lo cual forzará un nuevo QR
				await startWASocket();
			} catch (error) {
				console.error("[bot-process] Error durante el proceso de reinicio/desconexión:", error);
			}
		}
	}, 1000);
}

main().catch((error) => {
	console.error("[bot-process] Error crítico al arrancar main:", error);
	process.exit(1);
});
