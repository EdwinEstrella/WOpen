"use client";

import { useState, useEffect } from "react";
import { PhoneIcon } from "./Icons.tsx";

interface QRScreenProps {
	status: "disconnected" | "qr" | "connecting" | "connected";
	qrPng: string | null;
	updatedAt: Date | string | null;
}

export default function QRScreen({ status, qrPng, updatedAt }: QRScreenProps) {
	const [secondsDisconnected, setSecondsDisconnected] = useState(0);

	// Contador para detectar inactividad prolongada en la DB
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null;
		
		if (status === "disconnected" && !qrPng) {
			interval = setInterval(() => {
				setSecondsDisconnected((prev) => prev + 1);
			}, 1000);
		} else {
			setSecondsDisconnected(0);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [status, qrPng]);

	const showWarning = status === "disconnected" && !qrPng && secondsDisconnected >= 10;

	return (
		<div className="glass-panel rounded-3xl p-8 max-w-md w-full mx-auto text-center shadow-2xl relative border-outline-variant/20 bg-surface/80 backdrop-blur-xl">
			
			<div className="mb-6 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shrink-0 glow-active">
				<PhoneIcon className="text-primary" size={24} />
			</div>
			
			<h2 className="font-display text-base font-bold text-on-surface mb-2">Vincular Dispositivo WhatsApp</h2>
			<p className="text-[11px] text-on-surface-variant/80 mb-6 px-4 leading-relaxed">
				Escaneá el código QR desde la sección <strong className="text-on-surface font-semibold">"Dispositivos vinculados"</strong> en la aplicación móvil de WhatsApp de tu teléfono.
			</p>

			{/* Caja de renderizado del QR (Mantiene fondo claro/blanco para garantizar lectura por cámaras) */}
			<div className="relative w-64 h-64 bg-white border border-outline-variant/20 rounded-2xl flex flex-col items-center justify-center overflow-hidden mb-6 p-4 mx-auto shadow-inner">
				{status === "qr" && qrPng ? (
					<img
						src={qrPng}
						alt="WhatsApp Web QR Code"
						className="w-full h-full object-contain animate-fade-in"
					/>
				) : status === "connecting" ? (
					<div className="flex flex-col items-center gap-3 bg-slate-900/5 p-4 rounded-xl">
						<span className="relative flex h-3 w-3">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
							<span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
						</span>
						<span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest animate-pulse">Vinculando...</span>
					</div>
				) : (
					<div className="flex flex-col items-center gap-3">
						<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin glow-active"></div>
						<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Esperando credenciales...</span>
					</div>
				)}
			</div>

			{/* Barra informativa de estado */}
			<div className="flex items-center justify-center gap-2.5 bg-surface-container-low/40 px-4 py-2 rounded-xl border border-outline-variant/10 text-[10px] mb-4 w-fit mx-auto">
				{status === "qr" && (
					<>
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
						</span>
						<span className="font-semibold text-secondary uppercase tracking-wider">Esperando escaneo QR...</span>
					</>
				)}
				{status === "connecting" && (
					<>
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
						</span>
						<span className="font-semibold text-primary uppercase tracking-wider">Iniciando sesión...</span>
					</>
				)}
				{status === "disconnected" && (
					<>
						<span className="relative flex h-2 w-2">
							<span className="relative inline-flex rounded-full h-2 w-2 bg-on-surface-variant/40"></span>
						</span>
						<span className="font-semibold text-on-surface-variant uppercase tracking-wider">Desconectado ({secondsDisconnected}s)</span>
					</>
				)}
			</div>

			{/* Alerta de inactividad de daemon */}
			{showWarning && (
				<div className="p-3.5 bg-error/10 border border-error/20 rounded-xl text-error text-[10px] leading-relaxed animate-fade-in text-left">
					⚠️ <b>¿Lleva demasiado tiempo desconectado?</b><br />
					Si el código QR no se genera, asegúrate de que el daemon del bot de WhatsApp esté encendido en tu servidor ejecutando el script <code>npm run start:bot</code>.
				</div>
			)}
		</div>
	);
}
