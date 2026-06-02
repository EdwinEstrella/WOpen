"use client";

import { useState } from "react";

interface DashboardHeaderProps {
	phone: string | null;
	onDisconnect: () => void;
}

export default function DashboardHeader({
	phone,
	onDisconnect,
}: DashboardHeaderProps) {
	const [loading, setLoading] = useState(false);

	const handleDisconnect = async () => {
		if (loading || !confirm("¿Estás seguro de que querés desconectar tu WhatsApp? Se cerrará la sesión y tendrás que escanear un nuevo QR.")) return;
		setLoading(true);
		try {
			const res = await fetch("/api/connection/disconnect", { method: "POST" });
			if (res.ok) {
				onDisconnect();
			} else {
				console.error("[header] Error desconectando la sesión.");
			}
		} catch (error) {
			console.error("[header] Error de red desconectando la sesión:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<header className="bg-surface/60 backdrop-blur-xl border-b border-outline-variant/10 flex justify-between items-center h-16 px-6 shrink-0 z-40">
			
			{/* Título de Sección */}
			<div className="flex items-center gap-3">
				<div className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">
					Consola de Control
				</div>
				<span className="text-on-surface-variant/40">|</span>
				<span className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20 animate-pulse">
					Motor IA Activo
				</span>
			</div>

			{/* Status e Interacciones */}
			<div className="flex items-center gap-4">
				
				{/* Search Bar de adorno premium */}
				<div className="relative hidden md:block">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant/70">🔍</span>
					<input
						type="text"
						placeholder="Buscar en el panel..."
						className="bg-surface-container-low border border-outline-variant/20 rounded-full pl-8 pr-4 py-1 text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all w-48 placeholder-on-surface-variant/50 text-on-surface"
						disabled
					/>
				</div>

				{phone ? (
					<div className="flex items-center gap-3">
						{/* Badge de Conectado */}
						<div className="flex items-center gap-2 bg-surface-container border border-outline-variant/30 px-3 py-1 rounded-xl text-[11px] font-mono text-on-surface-variant shadow-inner">
							<span className="relative flex h-1.5 w-1.5 shrink-0">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
								<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
							</span>
							<span>+{phone}</span>
						</div>

						{/* Botón Desconectar */}
						<button
							onClick={handleDisconnect}
							disabled={loading}
							className="px-3 py-1 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-display text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50"
						>
							{loading ? "Saliendo..." : "Desconectar"}
						</button>
					</div>
				) : (
					<div className="flex items-center gap-2 bg-error/10 border border-error/20 px-3 py-1 rounded-xl text-[11px] text-error font-semibold">
						<span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
						<span>WhatsApp Desconectado</span>
					</div>
				)}

				<span className="text-on-surface-variant/20 hidden sm:inline">|</span>

				{/* Avatar de adorno premium */}
				<div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center bg-surface-container">
					<span className="text-xs">👤</span>
				</div>
			</div>

		</header>
	);
}
