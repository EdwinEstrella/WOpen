"use client";

import { useMemo, useState } from "react";
import type { ConversationListRow } from "../lib/db.ts";
import { RobotIcon, UserIcon } from "./Icons.tsx";

interface ConversationListProps {
	conversations: ConversationListRow[];
	selectedId: number | null;
	onSelectConversation: (id: number) => void;
	showArchived: boolean;
	onToggleArchived: (val: boolean) => void;
}

// Función helper para calcular tiempo transcurrido en formato relativo amable
function getRelativeTime(dateInput: string | Date | null | undefined): string {
	if (!dateInput) return "";
	const date = new Date(dateInput);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHrs = Math.floor(diffMin / 60);
	const diffDays = Math.floor(diffHrs / 24);

	if (diffSec < 60) return "ahora";
	if (diffMin < 60) return `hace ${diffMin} min`;
	if (diffHrs < 24) return `hace ${diffHrs} h`;
	if (diffDays === 1) return "ayer";
	return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

type FilterType = "ALL" | "PENDING" | "UNREAD" | "READ";

export default function ConversationList({
	conversations,
	selectedId,
	onSelectConversation,
	showArchived,
	onToggleArchived,
}: ConversationListProps) {
	const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
	const [searchQuery, setSearchQuery] = useState("");

	// Filtrado de las conversaciones
	const filteredConversations = useMemo(() => {
		const normalizedSearch = searchQuery.trim().toLowerCase();
		return conversations.filter((convo) => {
			if (normalizedSearch) {
				const nameMatch = convo.name?.toLowerCase().includes(normalizedSearch);
				const phoneMatch = convo.phone.toLowerCase().includes(normalizedSearch);
				if (!nameMatch && !phoneMatch) return false;
			}

			if (activeFilter === "PENDING") {
				// Conversaciones pendientes de respuesta (último mensaje fue del cliente/user)
				return convo.last_message_role === "user";
			}
			if (activeFilter === "UNREAD") {
				// Conversaciones con mensajes pendientes por leer
				return convo.unread_count > 0;
			}
			if (activeFilter === "READ") {
				// Conversaciones ya leídas (sin mensajes pendientes)
				return convo.unread_count === 0;
			}
			return true;
		});
	}, [conversations, activeFilter, searchQuery]);

	return (
		<div className="flex flex-col h-full bg-surface">
			{/* Encabezado de Lista */}
			<div className="p-4 flex items-center justify-between shrink-0">
				<h2 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">
					{showArchived ? "Chats Archivados" : "Chats Activos"}
				</h2>
				<div className="flex items-center gap-2">
					<button
						onClick={() => onToggleArchived(!showArchived)}
						className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all cursor-pointer"
					>
						{showArchived ? "Ver Activos" : "Ver Archivados"}
					</button>
					<span className="bg-primary/10 border border-primary/20 text-primary text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
						{filteredConversations.length}
					</span>
				</div>
			</div>

			{/* Buscador de Contactos */}
			<div className="px-4 pb-3 shrink-0">
				<div className="relative">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Buscar por nombre o teléfono..."
						className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl pl-8 pr-8 py-1.5 text-[11px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder-on-surface-variant/50 text-on-surface"
					/>
					<span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[10px]">
						🔍
					</span>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface text-[10px] font-bold"
						>
							✕
						</button>
					)}
				</div>
			</div>

			{/* Selector de Filtros */}
			<div className="px-4 pb-3 flex flex-wrap gap-1.5 shrink-0 border-b border-outline-variant/10">
				{[
					{ id: "ALL", label: "Todos" },
					{ id: "PENDING", label: "Pendientes" },
					{ id: "UNREAD", label: "Por leer" },
					{ id: "READ", label: "Leídos" },
				].map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveFilter(tab.id as FilterType)}
						className={`px-2.5 py-1 text-[9px] font-extrabold rounded-lg uppercase tracking-wider transition-all duration-200 border ${
							activeFilter === tab.id
								? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(12,83,58,0.1)]"
								: "bg-surface-container-lowest/50 border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>
			
			{/* Lista de Hilos */}
			<div className="flex-1 overflow-y-auto p-2 space-y-1">
				{filteredConversations.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant/60">
						<span className="text-3xl mb-3">💬</span>
						<p className="text-xs">No hay conversaciones bajo este filtro.</p>
					</div>
				) : (
					filteredConversations.map((convo) => {
						const isSelected = convo.id === selectedId;
						const displayName = convo.name?.trim() || `+${convo.phone}`;
						const relativeTime = getRelativeTime(convo.last_message_at);

						return (
							<button
								key={convo.id}
								onClick={() => onSelectConversation(convo.id)}
								className={`w-full text-left p-4 flex flex-col gap-1 transition-all duration-200 rounded-xl ${
									isSelected
										? "bg-primary/10 border border-primary"
										: "hover:bg-surface-bright/20 border border-transparent"
								}`}
							>
								{/* Fila superior: Nombre e indicador de tiempo */}
								<div className="flex items-center justify-between w-full">
									<div className="flex items-center gap-2 max-w-[170px] truncate">
										<span className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-on-surface"}`}>
											{displayName}
										</span>
										{convo.unread_count > 0 && (
											<span className="bg-primary text-on-primary text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
												{convo.unread_count}
											</span>
										)}
									</div>
									<span className="text-[9px] font-medium text-on-surface-variant/60">
										{relativeTime}
									</span>
								</div>

								{/* Fila de estado (IA / Humano) y preview */}
								<div className="flex items-center justify-between w-full mt-1.5 gap-4">
									<p className="text-[11px] text-on-surface-variant truncate max-w-[140px] italic">
										{convo.last_message_content || "Sin mensajes todavía"}
									</p>
									
									<span
										className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md tracking-widest uppercase shrink-0 flex items-center gap-1 ${
											convo.mode === "AI"
												? "bg-primary/10 text-primary border border-primary/20"
												: "bg-secondary/10 text-secondary border border-secondary/20"
										}`}
									>
										{convo.mode === "AI" ? (
											<>
												<RobotIcon size={8} /> IA
											</>
										) : (
											<>
												<UserIcon size={8} /> HUM
											</>
										)}
									</span>
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}
