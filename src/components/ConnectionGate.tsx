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

	// Efecto para realizar polling cada 2s
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
			<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
				<div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
				<span className="text-xs font-bold uppercase tracking-wider">Cargando aplicación...</span>
			</div>
		);
	}

	if (status !== "connected") {
		return (
			<div className="min-h-screen flex flex-col bg-gray-50">
				<DashboardHeader phone={null} onDisconnect={() => {}} />
				<main className="flex-1 flex items-center justify-center p-6">
					<QRScreen status={status} qrPng={qrPng} updatedAt={updatedAt} />
				</main>
			</div>
		);
	}

	return <>{children(phone, handleDisconnectLocal)}</>;
}
