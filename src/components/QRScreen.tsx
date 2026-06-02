"use client";

import { useState, useEffect } from "react";

interface QRScreenProps {
	status: "disconnected" | "qr" | "connecting" | "connected";
	qrPng: string | null;
	updatedAt: Date | string | null;
}

export default function QRScreen({ status, qrPng, updatedAt }: QRScreenProps) {
	const [secondsDisconnected, setSecondsDisconnected] = useState(0);

	// Contador para detectar si lleva más de 10s en estado desconectado sin QR
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
		<div className="flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-3xl shadow-xl max-w-md w-full mx-auto text-center transition-all duration-300">
			<div className="mb-6">
				<span className="text-5xl">📱</span>
			</div>
			
			<h2 className="text-xl font-bold text-gray-800 mb-2">Conectar número de WhatsApp</h2>
			<p className="text-xs text-gray-500 mb-6 px-4">
				Escaneá el código QR desde la sección "Dispositivos vinculados" en la aplicación móvil de WhatsApp de tu teléfono.
			</p>

			{/* Caja de renderizado principal del QR o Estados */}
			<div className="relative w-72 h-72 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center justify-center shadow-inner overflow-hidden mb-6 p-4">
				{status === "qr" && qrPng ? (
					<img
						src={qrPng}
						alt="WhatsApp Web QR Code"
						className="w-full h-full object-contain animate-fade-in"
					/>
				) : status === "connecting" ? (
					<div className="flex flex-col items-center gap-3">
						<span className="relative flex h-4 w-4">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
						</span>
						<span className="text-xs font-bold text-blue-600 uppercase tracking-widest animate-pulse">Conectando...</span>
					</div>
				) : (
					<div className="flex flex-col items-center gap-3">
						<div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
						<span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cargando credenciales...</span>
					</div>
				)}
			</div>

			{/* Barra informativa de estado del vinculador */}
			<div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-[11px] mb-4">
				{status === "qr" && (
					<>
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
						</span>
						<span className="font-semibold text-amber-700">Esperando escaneo...</span>
					</>
				)}
				{status === "connecting" && (
					<>
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
						</span>
						<span className="font-semibold text-blue-700">Vinculando sesión de WhatsApp...</span>
					</>
				)}
				{status === "disconnected" && (
					<>
						<span className="relative flex h-2 w-2">
							<span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
						</span>
						<span className="font-semibold text-gray-600">Desconectado ({secondsDisconnected}s)</span>
					</>
				)}
			</div>

			{/* Mensaje defensivo si demora más de 10s desconectado */}
			{showWarning && (
				<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[11px] leading-relaxed animate-fade-in">
					⚠️ <b>¿Está demorando demasiado?</b><br />
					No logramos generar el código QR. Esto suele significar que el proceso del bot está apagado. Asegurate de que el contenedor de Docker o el comando <code>npm run start:bot</code> esté corriendo en tu servidor.
				</div>
			)}
		</div>
	);
}
