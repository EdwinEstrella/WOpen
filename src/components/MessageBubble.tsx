"use client";

import { UserIcon, RobotIcon, ImageIcon, MicIcon } from "./Icons.tsx";
import type { MessageRow } from "../lib/db-contract.ts";

interface MessageBubbleProps {
	message: MessageRow;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
	const { role, content, media_type, created_at, metadata } = message;

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
		<div className={`flex w-full ${isUser ? "justify-start" : "justify-end"} mb-4`}>
			<div
				className={`max-w-[75%] p-4 rounded-2xl border transition-all duration-300 ${
					isUser
						? "bg-transparent border-outline-variant text-on-surface rounded-bl-none"
						: isAssistant
							? "bg-primary/10 border-primary/20 text-on-surface rounded-br-none"
							: "bg-secondary/10 border-secondary/20 text-on-surface rounded-br-none"
				}`}
			>
				{/* Encabezado descriptivo de quién envió el mensaje */}
				<div className="flex items-center justify-between gap-6 mb-2 pb-1 shrink-0">
					<span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
						isUser 
							? "text-primary" 
							: isAssistant 
							? "text-primary" 
							: "text-secondary"
					}`}>
						{isUser ? (
							<>CLIENTE</>
						) : isAssistant ? (
							<><RobotIcon size={10} /> IA</>
						) : (
							<><UserIcon size={10} /> Agente</>
						)}
					</span>
					<span className="text-[9px] font-mono text-on-surface-variant/50 flex items-center gap-1">
						{timeStr}
						{!isUser && <span className="text-primary tracking-tighter text-[10px]">✓✓</span>}
					</span>
				</div>

				{/* Soporte para tipos de medios (Multimedia) */}
				{media_type === "image" && (
					<div className="flex flex-col gap-2 mb-2 p-2 bg-background/50 rounded-2xl border border-outline-variant/10">
						{metadata?.mediaUrl ? (
							<img
								src={metadata.mediaUrl as string}
								alt="Imagen de WhatsApp"
								className="max-w-full max-h-[200px] rounded-xl object-contain cursor-pointer hover:brightness-95 transition-all"
								onClick={() => window.open(metadata.mediaUrl as string, '_blank')}
							/>
						) : (
							<div className="flex items-center gap-2 text-[10px] text-on-surface-variant/90 font-medium">
								<ImageIcon className="text-primary" size={12} />
								<span>Imagen recibida (Procesada por IA Multimodal)</span>
							</div>
						)}
					</div>
				)}
				{media_type === "audio" && (
					<div className="flex flex-col gap-2 mb-2 p-3 bg-background/50 rounded-2xl border border-outline-variant/10">
						<div className="flex items-center gap-2 text-[10px] text-on-surface-variant/90 font-medium">
							<MicIcon className="text-primary" size={12} />
							<span>Nota de voz</span>
						</div>
						{metadata?.mediaUrl ? (
							<audio
								src={metadata.mediaUrl as string}
								controls
								className="w-full h-8 mt-1 focus:outline-none"
							/>
						) : (
							<span className="text-[10px] text-on-surface-variant/60 italic">
								Transcribiendo o descargando...
							</span>
						)}
					</div>
				)}

				{/* Contenido del mensaje */}
				<p className="text-xs leading-relaxed whitespace-pre-wrap break-words m-0 text-on-surface font-medium">{content}</p>
			</div>
		</div>
	);
}
