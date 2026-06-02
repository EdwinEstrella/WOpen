// scripts/env-loader.ts DEBE ser el primer import para popular process.env antes de que otros módulos lo lean
import "./env-loader.ts";
import fs from "node:fs";
import { startWASocket, shutdownWASocket } from "../src/lib/baileys/client.ts";
import {
	getDestructiveRestartFlagPath,
	runtimePaths,
	clearDirectoryContents,
} from "../src/lib/runtime-paths.ts";
import { startFollowupsCron } from "./followups-cron.ts";

const restartFlagPath = getDestructiveRestartFlagPath();
const authDir = runtimePaths.authDir;

async function main() {
	console.log("[bot-process] Arrancando bot-process...");

	// Iniciamos el socket de Baileys
	await startWASocket();

	// Levantamos la tarea programada de follow-ups
	startFollowupsCron();

	// Loop de polling para la desconexión / reinicio manual controlado desde el frontend
	setInterval(async () => {
		if (fs.existsSync(restartFlagPath)) {
			console.log(
				"[bot-process] Bandera .reset-auth detectada. Reset destructivo solicitado desde el panel.",
			);
			try {
				// Borramos la bandera
				fs.unlinkSync(restartFlagPath);

				// Apagamos el socket actual limpiando listeners
				await shutdownWASocket();

				// Limpiamos la carpeta de sesión local auth/ como defensa
				if (fs.existsSync(authDir)) {
					clearDirectoryContents(authDir);
					console.log("[bot-process] Directorio auth/ vaciado con éxito.");
				}

				// Volvemos a arrancar limpio, lo cual forzará un nuevo QR
				await startWASocket();
			} catch (error) {
				console.error(
					"[bot-process] Error durante el proceso de reinicio/desconexión:",
					error,
				);
			}
		}
	}, 1000);
}

// Manejo de apagado limpio (Graceful Shutdown)
async function handleShutdown(signal: string) {
	console.log(`[bot-process] Recibido ${signal}. Cerrando de forma limpia...`);
	try {
		await shutdownWASocket();
		console.log("[bot-process] Socket de WhatsApp cerrado correctamente.");
		process.exit(0);
	} catch (error) {
		console.error("[bot-process] Error durante el cierre limpio:", error);
		process.exit(1);
	}
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

main().catch((error) => {
	console.error("[bot-process] Error crítico al arrancar main:", error);
	process.exit(1);
});
