import path from "node:path";

function resolveRuntimePath(
	value: string | undefined,
	fallbackName: string,
): string {
	if (value) return path.resolve(value);
	return path.join(/* turbopackIgnore: true */ process.cwd(), fallbackName);
}

export const runtimePaths = {
	authDir: resolveRuntimePath(process.env.WHATSAPP_AUTH_DIR, "auth"),
	dataDir: resolveRuntimePath(process.env.BOT_DATA_DIR, "data"),
};

export const destructiveRestartFlagName = ".reset-auth";

export function getDestructiveRestartFlagPath(): string {
	return path.join(runtimePaths.dataDir, destructiveRestartFlagName);
}
