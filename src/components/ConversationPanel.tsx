"use client";

import { useState, useEffect, useRef } from "react";
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

	// Efecto para inicializar y recargar mensajes periódicamente (polling de 2 segundos)
	useEffect(() => {
		loadMessages();
		const interval = setInterval(loadMessages, 2000);
		return () => clearInterval(interval);
	}, [conversation.id]);

	// Auto-scroll al fondo al cargar mensajes nuevos respetando la posición del scroll del usuario
	useEffect(() => {
		const container = chatContainerRef.current;
		if (!container) return;

		// Consideramos que está abajo si está a menos de 150px del final
		const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

		// Hacemos scroll si el usuario ya estaba abajo o si es la primera carga de la conversación
		if (isAtBottom || isFirstLoadRef.current) {
			chatEndRef.current?.scrollIntoView({
				behavior: isFirstLoadRef.current ? "auto" : "smooth",
			});
			isFirstLoadRef.current = false;
		}
	}, [messages]);

	// Enviar mensaje manual (en modo HUMAN)
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
		<div className="flex flex-col h-full bg-slate-50">
			{/* Cabecera del panel de conversación */}
			<div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
				<div className="flex flex-col">
					<span className="font-bold text-gray-800 text-base">{displayName}</span>
					<span className="text-[10px] text-gray-400 font-medium">JID: {conversation.phone}@s.whatsapp.net</span>
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
						className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs font-semibold transition-all duration-300 disabled:opacity-50"
						title="Borrar conversación completa de la DB"
					>
						🗑️ Borrar
					</button>
				</div>
			</div>

			{/* Contenedor del chat con scroll */}
			<div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
				{messages.length === 0 ? (
					<div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs">
						<span>💬</span>
						<p>No hay mensajes en este chat. Escribí un mensaje para iniciar.</p>
					</div>
				) : (
					messages.map((message) => <MessageBubble key={message.id} message={message} />)
				)}
				<div ref={chatEndRef} />
			</div>

			{/* Formulario / Composer inferior */}
			<div className="p-4 bg-white border-t border-gray-200 shadow-lg">
				{isAi ? (
					<div className="flex items-center justify-center p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold animate-pulse">
						🤖 El bot responde automáticamente en este chat. Cambiá a modo Humano si querés intervenir manualmente.
					</div>
				) : (
					<form onSubmit={handleSend} className="flex gap-2 w-full">
						<input
							type="text"
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Escribí un mensaje en modo Humano..."
							disabled={sending}
							className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-all duration-300 disabled:bg-gray-50"
						/>
						<button
							type="submit"
							disabled={sending || !text.trim()}
							className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-xs tracking-wider uppercase shadow-md hover:bg-amber-600 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:scale-100"
						>
							{sending ? "Enviando..." : "Enviar ➡️"}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
