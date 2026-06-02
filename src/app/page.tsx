"use client";

import { useState, useEffect } from "react";
import ConnectionGate from "../components/ConnectionGate.tsx";
import DashboardHeader from "../components/DashboardHeader.tsx";
import ConversationList from "../components/ConversationList.tsx";
import ConversationPanel from "../components/ConversationPanel.tsx";
import PromptsManager from "../components/PromptsManager.tsx";
import SettingsPanel from "../components/SettingsPanel.tsx";
import type { ConversationListRow } from "../lib/db.ts";

export default function Home() {
	const [activeTab, setActiveTab] = useState<"chats" | "prompts" | "settings">("chats");
	const [conversations, setConversations] = useState<ConversationListRow[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);

	// Función para cargar conversaciones desde el endpoint
	const loadConversations = async () => {
		try {
			const res = await fetch("/api/conversations");
			if (res.ok) {
				const data = await res.json();
				setConversations(data);
			}
		} catch (error) {
			console.error("[home] Error cargando conversaciones:", error);
		}
	};

	// Polling continuo cada 2s para mantener la lista actualizada
	useEffect(() => {
		loadConversations();
		const interval = setInterval(loadConversations, 2000);
		return () => clearInterval(interval);
	}, []);

	// Sincronizar el objeto seleccionado de la lista actualizada
	const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

	const handleModeChangeLocal = (newMode: "AI" | "HUMAN") => {
		setConversations((prev) =>
			prev.map((c) => (c.id === selectedId ? { ...c, mode: newMode } : c))
		);
	};

	const handleDeleteLocal = () => {
		setSelectedId(null);
		loadConversations();
	};

	return (
		<ConnectionGate>
			{(phone, onDisconnect) => (
				<div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
					{/* Encabezado Principal */}
					<DashboardHeader phone={phone} onDisconnect={onDisconnect} />

					{/* Menú de Pestañas / Tabs Navegación */}
					<div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
						<div className="max-w-[1440px] mx-auto px-6 flex gap-8">
							<button
								onClick={() => setActiveTab("chats")}
								className={`py-4 font-bold text-sm tracking-wider uppercase border-b-2 transition-all duration-300 ${
									activeTab === "chats"
										? "border-emerald-600 text-emerald-600"
										: "border-transparent text-gray-500 hover:text-emerald-600"
								}`}
							>
								💬 Chats
							</button>
							<button
								onClick={() => setActiveTab("prompts")}
								className={`py-4 font-bold text-sm tracking-wider uppercase border-b-2 transition-all duration-300 ${
									activeTab === "prompts"
										? "border-emerald-600 text-emerald-600"
										: "border-transparent text-gray-500 hover:text-emerald-600"
								}`}
							>
								✍️ System Prompts
							</button>
							<button
								onClick={() => setActiveTab("settings")}
								className={`py-4 font-bold text-sm tracking-wider uppercase border-b-2 transition-all duration-300 ${
									activeTab === "settings"
										? "border-emerald-600 text-emerald-600"
										: "border-transparent text-gray-500 hover:text-emerald-600"
								}`}
							>
								⚙️ Ajustes
							</button>
						</div>
					</div>

					{/* Contenido Dinámico de la Pestaña Activa */}
					<main className={`flex-1 max-w-[1440px] w-full mx-auto p-6 flex flex-col min-h-0 ${
						activeTab !== "chats" ? "overflow-y-auto" : "overflow-hidden"
					}`}>
						{activeTab === "chats" && (
							<div className="flex-1 bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg flex min-h-[500px]">
								{/* Columna Izquierda: Lista de Chats */}
								<div className="w-80 flex-shrink-0">
									<ConversationList
										conversations={conversations}
										selectedId={selectedId}
										onSelectConversation={setSelectedId}
									/>
								</div>

								{/* Columna Derecha: Panel de Conversación Activa */}
								<div className="flex-1 min-w-0">
									{selectedConversation ? (
										<ConversationPanel
											conversation={selectedConversation}
											onModeChanged={handleModeChangeLocal}
											onDeleted={handleDeleteLocal}
										/>
									) : (
										<div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
											<span className="text-4xl mb-3 animate-bounce">💬</span>
											<h3 className="font-bold text-gray-700 mb-1">Tu bandeja de entrada</h3>
											<p className="text-xs max-w-xs text-gray-400">
												Seleccioná un chat del panel izquierdo para empezar a gestionar la automatización o responder manualmente.
											</p>
										</div>
									)}
								</div>
							</div>
						)}

						{activeTab === "prompts" && (
							<div className="flex-1">
								<PromptsManager />
							</div>
						)}

						{activeTab === "settings" && (
							<div className="flex-1">
								<SettingsPanel />
							</div>
						)}
					</main>
				</div>
			)}
		</ConnectionGate>
	);
}
