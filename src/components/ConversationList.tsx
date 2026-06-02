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
		<div className="flex flex-col h-full bg-white border-r border-gray-200">
			<div className="p-4 border-b border-gray-100 flex items-center justify-between">
				<h2 className="text-lg font-bold text-gray-800">Conversaciones</h2>
				<span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-semibold">
					{conversations.length}
				</span>
			</div>
			
			<div className="flex-1 overflow-y-auto divide-y divide-gray-50">
				{conversations.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
						<span className="text-3xl mb-2">💬</span>
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
								className={`w-full text-left p-4 flex flex-col gap-1 transition-all duration-300 ${
									isSelected
										? "bg-gray-50/90 border-l-4 border-emerald-500"
										: "hover:bg-gray-50 border-l-4 border-transparent"
								}`}
							>
								<div className="flex items-center justify-between w-full">
									<span className={`font-semibold text-sm ${isSelected ? "text-gray-900" : "text-gray-800"}`}>
										{displayName}
									</span>
									<span className="text-[10px] text-gray-400 font-medium">
										{relativeTime}
									</span>
								</div>

								{/* Fila de estado (IA / Humano) y preview */}
								<div className="flex items-center justify-between w-full mt-1 gap-4">
									<p className="text-xs text-gray-500 truncate max-w-[150px]">
										{convo.last_message_content || <i>Sin mensajes todavía</i>}
									</p>
									
									<span
										className={`text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${
											convo.mode === "AI"
												? "bg-emerald-100 text-emerald-800 border border-emerald-200"
												: "bg-amber-100 text-amber-800 border border-amber-200"
										}`}
									>
										{convo.mode === "AI" ? "🤖 IA" : "👤 Humano"}
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
