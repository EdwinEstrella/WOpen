"use client";

import type { MessageRow } from "../lib/db-contract.ts";

interface MessageBubbleProps {
	message: MessageRow;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
	const { role, content, media_type, created_at } = message;

	const isUser = role === "user";
	const isAssistant = role === "assistant";
	const isHuman = role === "human";

	// Formateador de la hora legible
	const timeStr = created_at
		? new Date(created_at).toLocaleTimeString("es-ES", {
				hour: "2-digit",
				minute: "2-digit",
			})
		: "";

	return (
		<div className={`flex w-full ${isUser ? "justify-start" : "justify-end"} mb-3 animate-fade-in`}>
			<div
				className={`max-w-[70%] p-4 rounded-2xl shadow-sm border transition-all duration-300 ${
					isUser
						? "bg-white border-gray-200 text-gray-800 rounded-bl-none"
						: isAssistant
							? "bg-emerald-50 border-emerald-200 text-emerald-900 rounded-br-none"
							: "bg-amber-50 border-amber-200 text-amber-900 rounded-br-none"
				}`}
			>
				{/* Encabezado descriptivo de quién envió el mensaje */}
				<div className="flex items-center justify-between gap-6 mb-1">
					<span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
						{isUser ? "👤 Cliente" : isAssistant ? "🤖 IA (Asistente)" : "👨‍💼 Asesor Humano"}
					</span>
					<span className="text-[10px] opacity-50">{timeStr}</span>
				</div>

				{/* Soporte para tipos de medios (Multimedia) */}
				{media_type === "image" && (
					<div className="flex items-center gap-2 mb-2 p-2 bg-black/5 rounded-lg border border-black/10 text-xs">
						📷 <i>Imagen recibida (Procesada por DeepSeek Multimodal)</i>
					</div>
				)}
				{media_type === "audio" && (
					<div className="flex items-center gap-2 mb-2 p-2 bg-black/5 rounded-lg border border-black/10 text-xs">
						🎙️ <i>Nota de voz recibida (Transcribiendo...)</i>
					</div>
				)}

				{/* Contenido del mensaje */}
				<p className="text-sm leading-relaxed whitespace-pre-wrap break-words m-0">{content}</p>
			</div>
		</div>
	);
}
