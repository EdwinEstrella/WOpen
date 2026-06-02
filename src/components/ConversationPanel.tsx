"use client";

import { useState, useEffect, useRef } from "react";
import { TrashIcon, MessagesIcon, RobotIcon, ArrowRightIcon } from "./Icons.tsx";
import type { ConversationListRow } from "../lib/db.ts";
import type { MessageRow } from "../lib/db-contract.ts";
import MessageBubble from "./MessageBubble.tsx";
import ModeToggle from "./ModeToggle.tsx";

interface ConversationPanelProps {
	conversation: ConversationListRow;
	onModeChanged: (newMode: "AI" | "HUMAN") => void;
	onDeleted: () => void;
}

export default function ConversationPanel({
	conversation,
	onModeChanged,
	onDeleted,
}: ConversationPanelProps) {
	const [messages, setMessages] = useState<MessageRow[]>([]);
	const [text, setText] = useState("");
	const [sending, setSending] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const chatEndRef = useRef<HTMLDivElement>(null);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const isFirstLoadRef = useRef(true);

	// Resetear el flag de primera carga al cambiar de conversación
	useEffect(() => {
		isFirstLoadRef.current = true;
	}, [conversation.id]);

	// Endpoint para recargar el historial de mensajes
	const loadMessages = async () => {
		try {
			const res = await fetch(`/api/messages/${conversation.id}`);
			if (res.ok) {
				const data = await res.json();
				setMessages(data);
			}
		} catch (error) {
			console.error("[panel] Error cargando mensajes del chat:", error);
		}
	};

	// Polling de 2 segundos
	useEffect(() => {
		loadMessages();
		const interval = setInterval(loadMessages, 2000);
		return () => clearInterval(interval);
	}, [conversation.id]);

	// Auto-scroll respetuoso
	useEffect(() => {
		const container = chatContainerRef.current;
		if (!container) return;

		const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

		if (isAtBottom || isFirstLoadRef.current) {
			chatEndRef.current?.scrollIntoView({
				behavior: isFirstLoadRef.current ? "auto" : "smooth",
			});
			isFirstLoadRef.current = false;
		}
	}, [messages]);

	// Enviar mensaje manual
	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!text.trim() || sending || conversation.mode === "AI") return;
		setSending(true);
		try {
			const res = await fetch(`/api/messages/${conversation.id}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ content: text }),
			});
			if (res.ok) {
				setText("");
				await loadMessages();
			} else {
				console.error("[send] Error enviando mensaje manual.");
			}
		} catch (error) {
			console.error("[send] Error de red enviando mensaje:", error);
		} finally {
			setSending(false);
		}
	};

	// Eliminar conversación completa
	const handleDelete = async () => {
		if (deleting || !confirm("¿Estás seguro de que querés borrar esta conversación? Esta acción no se puede deshacer.")) return;
		setDeleting(true);
		try {
			const res = await fetch(`/api/conversations/${conversation.id}`, {
				method: "DELETE",
			});
			if (res.ok) {
				onDeleted();
			} else {
				console.error("[delete] Error eliminando conversación.");
			}
		} catch (error) {
			console.error("[delete] Error de red eliminando conversación:", error);
		} finally {
			setDeleting(false);
		}
	};

	const isAi = conversation.mode === "AI";
	const displayName = conversation.name?.trim() || `+${conversation.phone}`;

	return (
		<div className="flex flex-col h-full bg-background rounded-r-3xl overflow-hidden">
			
			{/* Cabecera del Panel de Conversación */}
			<div className="p-4 bg-background border-b border-outline-variant flex items-center justify-between shrink-0">
				<div className="flex flex-col">
					<span className="font-display text-sm font-bold text-on-surface">{displayName}</span>
					<span className="flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant/80 tracking-wider mt-0.5">
						<span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
						{conversation.phone}@s.whatsapp.net
					</span>
				</div>
				
				<div className="flex items-center gap-4">
					<ModeToggle
						conversationId={conversation.id}
						currentMode={conversation.mode}
						onModeChange={onModeChanged}
					/>
					
					<button
						onClick={handleDelete}
						disabled={deleting}
						className="px-3 py-1.5 text-error hover:bg-error/10 border border-error rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5"
						title="Borrar conversación completa de la DB"
					>
						<TrashIcon size={12} /> Borrar
					</button>
				</div>
			</div>

			{/* Contenedor de Mensajes con Scroll */}
			<div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-h-0 bg-background/50">
				{messages.length === 0 ? (
					<div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/60 text-xs gap-2">
						<MessagesIcon className="text-on-surface-variant/30 animate-pulse mb-1" size={32} />
						<p>No hay mensajes en este chat. Escribí un mensaje para iniciar.</p>
					</div>
				) : (
					messages.map((message) => <MessageBubble key={message.id} message={message} />)
				)}
				<div ref={chatEndRef} />
			</div>

			{/* Composer / Input Inferior */}
			<div className="p-4 bg-background border-t border-outline-variant shrink-0">
				{isAi ? (
					<div className="flex items-center justify-center gap-2.5 p-3 border border-outline-variant rounded-full text-on-surface-variant text-[11px] font-medium">
						<RobotIcon className="text-primary" size={14} />
						<span>El bot responde automáticamente. Cambia a modo <span className="text-primary cursor-pointer hover:underline" onClick={() => onModeChanged("HUMAN")}>Humano</span> si querés intervenir manualmente.</span>
					</div>
				) : (
					<form onSubmit={handleSend} className="flex gap-2.5 w-full">
						<input
							type="text"
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Escribí un mensaje en modo Humano..."
							disabled={sending}
							className="flex-1 px-4 py-2.5 bg-surface border border-outline-variant rounded-full text-xs focus:outline-none focus:border-primary/50 transition-all duration-200 disabled:opacity-50 text-on-surface placeholder-on-surface-variant/50"
						/>
						<button
							type="submit"
							disabled={sending || !text.trim()}
							className="w-10 h-10 flex items-center justify-center bg-transparent text-primary hover:bg-surface rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50"
						>
							{sending ? "..." : <ArrowRightIcon size={18} />}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
