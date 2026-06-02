"use client";

import type { ConversationListRow } from "../lib/db.ts";

interface ConversationListProps {
	conversations: ConversationListRow[];
	selectedId: number | null;
	onSelectConversation: (id: number) => void;
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

export default function ConversationList({
	conversations,
	selectedId,
	onSelectConversation,
}: ConversationListProps) {
	return (
		<div className="flex flex-col h-full bg-surface-container/20">
			{/* Encabezado de Lista */}
			<div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low/20 shrink-0">
				<h2 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">Chats Activos</h2>
				<span className="bg-primary/10 border border-primary/20 text-primary text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
					{conversations.length}
				</span>
			</div>
			
			{/* Lista de Hilos */}
			<div className="flex-1 overflow-y-auto divide-y divide-outline-variant/5">
				{conversations.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant/60">
						<span className="text-3xl mb-3">💬</span>
						<p className="text-xs">No hay conversaciones activas.</p>
					</div>
				) : (
					conversations.map((convo) => {
						const isSelected = convo.id === selectedId;
						const displayName = convo.name?.trim() || `+${convo.phone}`;
						const relativeTime = getRelativeTime(convo.last_message_at);

						return (
							<button
								key={convo.id}
								onClick={() => onSelectConversation(convo.id)}
								className={`w-full text-left p-4 flex flex-col gap-1 transition-all duration-200 border-l-4 ${
									isSelected
										? "bg-primary/5 border-l-primary glow-active"
										: "hover:bg-surface-bright/20 border-l-transparent"
								}`}
							>
								{/* Fila superior: Nombre e indicador de tiempo */}
								<div className="flex items-center justify-between w-full">
									<span className={`text-xs font-semibold truncate max-w-[160px] ${isSelected ? "text-primary" : "text-on-surface"}`}>
										{displayName}
									</span>
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
										className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md tracking-widest uppercase shrink-0 ${
											convo.mode === "AI"
												? "bg-primary/10 text-primary border border-primary/20"
												: "bg-secondary/10 text-secondary border border-secondary/20"
										}`}
									>
										{convo.mode === "AI" ? "🤖 IA" : "👤 HUM"}
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
