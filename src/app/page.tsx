"use client";

import { useState, useEffect } from "react";
import ConnectionGate from "../components/ConnectionGate.tsx";
import DashboardHeader from "../components/DashboardHeader.tsx";
import ConversationList from "../components/ConversationList.tsx";
import ConversationPanel from "../components/ConversationPanel.tsx";
import PromptsManager from "../components/PromptsManager.tsx";
import SettingsPanel from "../components/SettingsPanel.tsx";
import DashboardOverview from "../components/DashboardOverview.tsx";
import AutomationsOverview from "../components/AutomationsOverview.tsx";
import ContactsOverview from "../components/ContactsOverview.tsx";
import type { ConversationListRow } from "../lib/db.ts";

type Tab = "dashboard" | "chats" | "prompts" | "automations" | "contacts" | "settings";

export default function Home() {
	const [activeTab, setActiveTab] = useState<Tab>("dashboard");
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
				<div className="h-screen w-full flex bg-background text-on-surface antialiased font-sans overflow-hidden">
					
					{/* Sidebar Lateral Fijo (Stitch Navigation) */}
					<nav className="fixed left-0 top-0 h-screen w-[280px] bg-surface border-r border-outline-variant/10 flex flex-col py-6 px-4 z-50">
						
						{/* Header de Marca */}
						<div className="flex items-center gap-3 mb-10 px-2 shrink-0">
							<div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 glow-active">
								<span className="text-xl text-primary">🤖</span>
							</div>
							<div>
								<h1 className="font-display text-base font-bold text-primary leading-tight">Bot Personal</h1>
								<p className="text-[10px] font-semibold text-on-surface-variant/70 uppercase tracking-wide mt-0.5">WhatsApp CRM</p>
							</div>
						</div>

						{/* Links de Navegación */}
						<div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
							
							{/* Dashboard overview */}
							<button
								onClick={() => setActiveTab("dashboard")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "dashboard"
										? "text-primary border-r-2 border-primary bg-primary/5 glow-active scale-95"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<span className="text-sm">📊</span>
								<span>Dashboard</span>
							</button>

							{/* Conversations Workspace */}
							<button
								onClick={() => setActiveTab("chats")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "chats"
										? "text-primary border-r-2 border-primary bg-primary/5 glow-active scale-95"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<span className="text-sm">💬</span>
								<span>Conversaciones</span>
							</button>

							{/* AI System Prompts */}
							<button
								onClick={() => setActiveTab("prompts")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "prompts"
										? "text-primary border-r-2 border-primary bg-primary/5 glow-active scale-95"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<span className="text-sm">✍️</span>
								<span>AI Prompts</span>
							</button>

							{/* Workflow Builder */}
							<button
								onClick={() => setActiveTab("automations")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "automations"
										? "text-primary border-r-2 border-primary bg-primary/5 glow-active scale-95"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<span className="text-sm">⚡</span>
								<span>Automatizaciones</span>
							</button>

							{/* Contacts CRM */}
							<button
								onClick={() => setActiveTab("contacts")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "contacts"
										? "text-primary border-r-2 border-primary bg-primary/5 glow-active scale-95"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<span className="text-sm">👥</span>
								<span>Contactos CRM</span>
							</button>

							{/* Settings Panel */}
							<button
								onClick={() => setActiveTab("settings")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "settings"
										? "text-primary border-r-2 border-primary bg-primary/5 glow-active scale-95"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<span className="text-sm">⚙️</span>
								<span>Ajustes</span>
							</button>

						</div>

						{/* Footer / Status */}
						<div className="mt-auto pt-6 border-t border-outline-variant/10 space-y-2 shrink-0">
							<div className="flex items-center justify-between px-2 py-1">
								<span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/80">Sistema</span>
								<div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
									<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
									<span className="text-[9px] text-primary font-bold uppercase tracking-wider">Online</span>
								</div>
							</div>
							<div className="text-[9px] text-center text-on-surface-variant/40 font-mono tracking-widest">
								NEXUS CRM v1.0.0
							</div>
						</div>
					</nav>

					{/* Contenedor Principal de Contenido (pl-[280px] para respetar el Sidebar Fijo) */}
					<div className="pl-[280px] flex-1 h-screen w-full flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-container/20 via-surface to-background">
						
						{/* Encabezado Superior */}
						<DashboardHeader phone={phone} onDisconnect={onDisconnect} />

						{/* Contenido Dinámico de Pestañas */}
						<main className="flex-1 p-6 overflow-hidden flex flex-col min-h-0">
							
							{activeTab === "dashboard" && <DashboardOverview />}

							{activeTab === "chats" && (
								<div className="flex-1 glass-panel rounded-3xl overflow-hidden flex min-h-[500px] shadow-2xl">
									{/* Columna Izquierda: Lista de Chats */}
									<div className="w-80 flex-shrink-0 border-r border-outline-variant/10">
										<ConversationList
											conversations={conversations}
											selectedId={selectedId}
											onSelectConversation={setSelectedId}
										/>
									</div>

									{/* Columna Derecha: Panel de Conversación Activa */}
									<div className="flex-1 min-w-0 bg-surface-container-lowest/10">
										{selectedConversation ? (
											<ConversationPanel
												conversation={selectedConversation}
												onModeChanged={handleModeChangeLocal}
												onDeleted={handleDeleteLocal}
											/>
										) : (
											<div className="h-full flex flex-col items-center justify-center text-on-surface-variant p-8 text-center bg-surface-container-lowest/5">
												<span className="text-4xl mb-4 animate-bounce">💬</span>
												<h3 className="font-display text-sm font-bold text-on-surface mb-1">Tu bandeja de entrada</h3>
												<p className="text-xs max-w-xs text-on-surface-variant/80">
													Seleccioná una conversación del panel izquierdo para empezar a gestionar la automatización o responder manualmente.
												</p>
											</div>
										)}
									</div>
								</div>
							)}

							{activeTab === "prompts" && <PromptsManager />}

							{activeTab === "automations" && <AutomationsOverview />}

							{activeTab === "contacts" && <ContactsOverview />}

							{activeTab === "settings" && <SettingsPanel />}

						</main>
					</div>

				</div>
			)}
		</ConnectionGate>
	);
}
