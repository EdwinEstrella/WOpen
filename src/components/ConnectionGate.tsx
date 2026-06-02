"use client";

import { useState, useEffect } from "react";
import QRScreen from "./QRScreen.tsx";
import DashboardHeader from "./DashboardHeader.tsx";

interface ConnectionGateProps {
	children: (phone: string | null, onDisconnect: () => void) => React.ReactNode;
}

export default function ConnectionGate({ children }: ConnectionGateProps) {
	const [status, setStatus] = useState<"disconnected" | "qr" | "connecting" | "connected">("disconnected");
	const [qrPng, setQrPng] = useState<string | null>(null);
	const [phone, setPhone] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState<Date | string | null>(null);
	const [loading, setLoading] = useState(true);

	const checkConnection = async () => {
		try {
			const res = await fetch("/api/connection/status");
			if (res.ok) {
				const data = await res.json();
				setStatus(data.status);
				setQrPng(data.qrPng);
				setPhone(data.phone);
				setUpdatedAt(data.updatedAt);
			}
		} catch (error) {
			console.error("[gate] Error verificando estado de conexión:", error);
		} finally {
			setLoading(false);
		}
	};

	// Polling de 2 segundos
	useEffect(() => {
		checkConnection();
		const interval = setInterval(checkConnection, 2000);
		return () => clearInterval(interval);
	}, []);

	const handleDisconnectLocal = () => {
		setStatus("disconnected");
		setQrPng(null);
		setPhone(null);
		checkConnection();
	};

	if (loading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-surface-variant">
				<div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4 glow-active"></div>
				<span className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Cargando aplicación...</span>
			</div>
		);
	}

	if (status !== "connected") {
		return (
			<div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
				{/* Ambient Glows */}
				<div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
				<div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -ml-20 -mb-20"></div>

				<DashboardHeader phone={null} onDisconnect={() => {}} />
				<main className="flex-1 flex items-center justify-center p-6 z-10">
					<QRScreen status={status} qrPng={qrPng} updatedAt={updatedAt} />
				</main>
			</div>
		);
	}

	return <>{children(phone, handleDisconnectLocal)}</>;
}
