"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import ConnectionGate from "../components/ConnectionGate.tsx";
import DashboardHeader from "../components/DashboardHeader.tsx";
import ConversationList from "../components/ConversationList.tsx";
import ConversationPanel from "../components/ConversationPanel.tsx";
import PromptsManager from "../components/PromptsManager.tsx";
import SettingsPanel from "../components/SettingsPanel.tsx";
import DashboardOverview from "../components/DashboardOverview.tsx";
import AutomationsOverview from "../components/AutomationsOverview.tsx";
import ContactsOverview from "../components/ContactsOverview.tsx";
import {
	RobotIcon,
	DashboardIcon,
	MessagesIcon,
	BrainIcon,
	ZapIcon,
	UsersIcon,
	SettingsIcon,
} from "../components/Icons.tsx";
import type { ConversationListRow } from "../lib/db.ts";

type Tab =
	| "dashboard"
	| "chats"
	| "prompts"
	| "automations"
	| "contacts"
	| "settings";

export default function Home() {
	const [activeTab, setActiveTab] = useState<Tab>("dashboard");
	const [conversations, setConversations] = useState<ConversationListRow[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const prevConversationsRef = useRef<ConversationListRow[]>([]);

	// Pedir permiso de notificaciones en el navegador
	useEffect(() => {
		if (typeof window !== "undefined" && "Notification" in window) {
			if (Notification.permission === "default") {
				Notification.requestPermission().catch(() => {});
			}
		}
	}, []);

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

	// Comparar para enviar notificaciones de navegador si llega un mensaje nuevo en segundo plano
	useEffect(() => {
		const prev = prevConversationsRef.current;
		if (prev.length > 0) {
			for (const currentConvo of conversations) {
				const oldConvo = prev.find((c) => c.id === currentConvo.id);
				const hasNewMessages = oldConvo
					? currentConvo.unread_count > oldConvo.unread_count
					: currentConvo.unread_count > 0;

				if (hasNewMessages && currentConvo.id !== selectedId) {
					if (
						typeof window !== "undefined" &&
						"Notification" in window &&
						Notification.permission === "granted"
					) {
						new Notification(currentConvo.name?.trim() || `+${currentConvo.phone}`, {
							body: currentConvo.last_message_content || "Nuevo mensaje de WhatsApp",
						});
					}
				}
			}
		}
		prevConversationsRef.current = conversations;
	}, [conversations, selectedId]);

	// Ordenamiento de conversaciones:
	// - La conversación seleccionada (abierta) se mantiene al tope (index 0).
	// - Las demás se ordenan por last_message_at descendente (más recientes primero) por debajo.
	// - Si no hay ninguna seleccionada, todas se ordenan por last_message_at descendente.
	const sortedConversations = useMemo(() => {
		const list = [...conversations];
		if (selectedId === null) {
			return list.sort((a, b) => {
				const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
				const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
				return timeB - timeA || b.id - a.id;
			});
		}

		const active = list.find((c) => c.id === selectedId);
		const others = list.filter((c) => c.id !== selectedId).sort((a, b) => {
			const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
			const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
			return timeB - timeA || b.id - a.id;
		});

		return active ? [active, ...others] : others;
	}, [conversations, selectedId]);

	// Sincronizar el objeto seleccionado de la lista actualizada
	const selectedConversation =
		conversations.find((c) => c.id === selectedId) || null;

	const handleModeChangeLocal = (newMode: "AI" | "HUMAN") => {
		setConversations((prev) =>
			prev.map((c) => (c.id === selectedId ? { ...c, mode: newMode } : c)),
		);
	};

	const handleDeleteLocal = () => {
		setSelectedId(null);
		loadConversations();
	};

	const handleConversationUpdated = (updated: ConversationListRow) => {
		setConversations((prev) =>
			prev.map((conversation) =>
				conversation.id === updated.id
					? { ...conversation, ...updated }
					: conversation,
			),
		);
	};

	return (
		<ConnectionGate>
			{(phone, onDisconnect) => (
				<div className="h-screen w-full flex bg-background text-on-surface antialiased font-sans overflow-hidden">
					{/* Sidebar Lateral Fijo (Stitch Navigation) */}
					<nav className="fixed left-0 top-0 h-screen w-[280px] bg-surface/95 border-r border-outline-variant/30 flex flex-col py-6 px-4 z-50 shadow-[20px_0_60px_rgba(12,83,58,0.14)] backdrop-blur-xl">
						{/* Header de Marca */}
						<div className="flex items-center gap-3 mb-10 px-2 shrink-0">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 border border-primary/40 glow-active">
								<RobotIcon className="text-on-primary" size={20} />
							</div>
							<div>
								<h1 className="font-display text-base font-bold text-primary leading-tight">
									Bot Personal
								</h1>
								<p className="text-[10px] font-semibold text-on-surface-variant/70 uppercase tracking-wide mt-0.5">
									WhatsApp CRM
								</p>
							</div>
						</div>

						{/* Links de Navegación */}
						<div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
							{/* Dashboard overview */}
							<button
								onClick={() => setActiveTab("dashboard")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "dashboard"
										? "text-primary border border-primary bg-primary/10 rounded-xl"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<DashboardIcon size={16} />
								<span>Dashboard</span>
							</button>

							{/* Conversations Workspace */}
							<button
								onClick={() => setActiveTab("chats")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "chats"
										? "text-primary border border-primary bg-primary/10 rounded-xl"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<MessagesIcon size={16} />
								<span>Conversaciones</span>
							</button>

							{/* AI System Prompts */}
							<button
								onClick={() => setActiveTab("prompts")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "prompts"
										? "text-primary border border-primary bg-primary/10 rounded-xl"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<BrainIcon size={16} />
								<span>AI Prompts</span>
							</button>

							{/* Workflow Builder */}
							<button
								onClick={() => setActiveTab("automations")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "automations"
										? "text-primary border border-primary bg-primary/10 rounded-xl"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<ZapIcon size={16} />
								<span>Automatizaciones</span>
							</button>

							{/* Contacts CRM */}
							<button
								onClick={() => setActiveTab("contacts")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "contacts"
										? "text-primary border border-primary bg-primary/10 rounded-xl"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<UsersIcon size={16} />
								<span>Contactos CRM</span>
							</button>

							{/* Settings Panel */}
							<button
								onClick={() => setActiveTab("settings")}
								className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
									activeTab === "settings"
										? "text-primary border border-primary bg-primary/10 rounded-xl"
										: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
								}`}
							>
								<SettingsIcon size={16} />
								<span>Ajustes</span>
							</button>
						</div>

						{/* Footer / Status */}
						<div className="mt-auto pt-6 border-t border-outline-variant/10 space-y-2 shrink-0">
							<div className="flex items-center justify-between px-2 py-1">
								<span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/80">
									Sistema
								</span>
								<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-transparent border border-outline-variant">
									<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
									<span className="text-[9px] text-primary font-bold uppercase tracking-wider">
										Online
									</span>
								</div>
							</div>
							<div className="text-[9px] text-center text-on-surface-variant/40 font-mono tracking-widest">
								NEXUS CRM v1.0.0
							</div>
						</div>
					</nav>

					{/* Contenedor Principal de Contenido (pl-[280px] para respetar el Sidebar Fijo) */}
					<div className="pl-[280px] flex-1 h-screen w-full flex flex-col relative overflow-hidden bg-background">
						{/* Encabezado Superior */}
						<DashboardHeader phone={phone} onDisconnect={onDisconnect} />

						{/* Contenido Dinámico de Pestañas */}
						<main className="flex-1 p-6 overflow-hidden flex flex-col min-h-0 relative z-10">
							{activeTab === "dashboard" && <DashboardOverview conversations={conversations} />}

							{activeTab === "chats" && (
								<div className="flex-1 glass-panel rounded-2xl overflow-hidden flex min-h-[500px] shadow-2xl">
									{/* Columna Izquierda: Lista de Chats */}
									<div className="w-80 flex-shrink-0 border-r border-outline-variant/10">
										<ConversationList
											conversations={sortedConversations}
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
												onConversationUpdated={handleConversationUpdated}
											/>
										) : (
											<div className="h-full flex flex-col items-center justify-center text-on-surface-variant p-8 text-center bg-surface-container-lowest/5">
												<MessagesIcon
													className="text-on-surface-variant/30 animate-pulse mb-4"
													size={48}
												/>
												<h3 className="font-display text-sm font-bold text-on-surface mb-1">
													Tu bandeja de entrada
												</h3>
												<p className="text-xs max-w-xs text-on-surface-variant/80">
													Seleccioná una conversación del panel izquierdo para
													empezar a gestionar la automatización o responder
													manualmente.
												</p>
											</div>
										)}
									</div>
								</div>
							)}

							{activeTab === "prompts" && <PromptsManager />}

							{activeTab === "automations" && <AutomationsOverview />}

							{activeTab === "contacts" && (
								<ContactsOverview conversations={conversations} />
							)}

							{activeTab === "settings" && <SettingsPanel />}
						</main>
					</div>
				</div>
			)}
		</ConnectionGate>
	);
}
