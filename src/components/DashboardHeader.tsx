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
		<header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
			<div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="text-xl">🤖</span>
					<div className="flex flex-col">
						<h1 className="text-base font-extrabold tracking-tight m-0">WhatsApp Agent</h1>
						<span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Local Dashboard</span>
					</div>
				</div>

				{phone && (
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
							</span>
							<span className="font-semibold text-gray-300">Conectado: +{phone}</span>
						</div>

						<button
							onClick={handleDisconnect}
							disabled={loading}
							className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50"
						>
							{loading ? "Desconectando..." : "Desconectar"}
						</button>
					</div>
				)}
			</div>
		</header>
	);
}
