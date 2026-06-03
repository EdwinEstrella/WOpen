"use client";

import { useState, useEffect, useRef } from "react";
import { TrashIcon, MessagesIcon, RobotIcon, ArrowRightIcon, ArrowDownIcon, UserIcon, PhoneIcon, EditIcon, ArchiveIcon } from "./Icons.tsx";
import type { ConversationListRow } from "../lib/db.ts";
import type { MessageRow } from "../lib/db-contract.ts";
import MessageBubble from "./MessageBubble.tsx";
import ModeToggle from "./ModeToggle.tsx";

interface ConversationPanelProps {
	conversation: ConversationListRow;
	onModeChanged: (newMode: "AI" | "HUMAN") => void;
	onDeleted: () => void;
	onConversationUpdated?: (conversation: ConversationListRow) => void;
	quickReplies?: Array<{ id: string; shortcut: string; text: string }>;
}

export default function ConversationPanel({
	conversation,
	onModeChanged,
	onDeleted,
	onConversationUpdated,
	quickReplies = [],
}: ConversationPanelProps) {
	const [messages, setMessages] = useState<MessageRow[]>([]);
	const [text, setText] = useState("");
	const [sending, setSending] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [archiving, setArchiving] = useState(false);
	const [showScrollDown, setShowScrollDown] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);
	const [profileName, setProfileName] = useState(conversation.name?.trim() || "");
	const [savingProfile, setSavingProfile] = useState(false);
	const [zoomImage, setZoomImage] = useState<string | null>(null);

	const chatEndRef = useRef<HTMLDivElement>(null);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const isFirstLoadRef = useRef(true);
	const prevMessagesLengthRef = useRef(0);

	// Respuestas rápidas (/)
	const [showRepliesDropdown, setShowRepliesDropdown] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const [filterText, setFilterText] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	// Detectar trigger de /
	useEffect(() => {
		const lastSlashIdx = text.lastIndexOf("/");
		if (lastSlashIdx !== -1) {
			const charBefore = lastSlashIdx > 0 ? text[lastSlashIdx - 1] : "";
			if (charBefore === "" || charBefore === " ") {
				const query = text.slice(lastSlashIdx + 1);
				if (!query.includes(" ")) {
					setFilterText(query);
					setShowRepliesDropdown(true);
					setActiveIndex(0);
					return;
				}
			}
		}
		setShowRepliesDropdown(false);
	}, [text]);

	const filteredReplies = quickReplies.filter((reply) =>
		reply.shortcut.toLowerCase().startsWith(filterText.toLowerCase())
	);

	const handleSelectReply = (replyText: string) => {
		const lastSlashIdx = text.lastIndexOf("/");
		if (lastSlashIdx !== -1) {
			const prefix = text.slice(0, lastSlashIdx);
			setText(prefix + replyText + " ");
		}
		setShowRepliesDropdown(false);
		setTimeout(() => {
			inputRef.current?.focus();
		}, 10);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (showRepliesDropdown && filteredReplies.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveIndex((prev) => (prev + 1) % filteredReplies.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIndex((prev) => (prev - 1 + filteredReplies.length) % filteredReplies.length);
			} else if (e.key === "Enter") {
				e.preventDefault();
				handleSelectReply(filteredReplies[activeIndex].text);
			} else if (e.key === "Escape") {
				e.preventDefault();
				setShowRepliesDropdown(false);
			}
		}
	};

	// Resetear flags al cambiar de conversación
	useEffect(() => {
		isFirstLoadRef.current = true;
		prevMessagesLengthRef.current = 0;
		setShowScrollDown(false);
		setProfileName(conversation.name?.trim() || "");
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

	// Escuchar scroll del contenedor para mostrar/ocultar el botón flotante
	const handleScroll = () => {
		const container = chatContainerRef.current;
		if (!container) return;

		const isFarFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight > 200;
		setShowScrollDown(isFarFromBottom);
	};

	useEffect(() => {
		const container = chatContainerRef.current;
		if (!container) return;

		container.addEventListener("scroll", handleScroll);
		handleScroll();

		return () => {
			container.removeEventListener("scroll", handleScroll);
		};
	}, [conversation.id]);

	// Bajar al fondo
	const scrollToBottom = () => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
		setShowScrollDown(false);
	};

	// Auto-scroll respetuoso pero inmediato si llega un mensaje nuevo
	useEffect(() => {
		const lengthChanged = messages.length > prevMessagesLengthRef.current;
		prevMessagesLengthRef.current = messages.length;

		if (isFirstLoadRef.current || lengthChanged) {
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

	// Archivar conversación
	const handleArchive = async () => {
		if (archiving) return;
		setArchiving(true);
		try {
			const res = await fetch(`/api/conversations/${conversation.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ is_archived: !conversation.is_archived }),
			});
			if (res.ok) {
				onDeleted();
			} else {
				console.error("[archive] Error actualizando estado de archivado.");
			}
		} catch (error) {
			console.error("[archive] Error de red actualizando estado de archivado:", error);
		} finally {
			setArchiving(false);
		}
	};

	const isAi = conversation.mode === "AI";
	const cleanPhone = conversation.phone.replace(/@.*/, "");
	const displayName = conversation.name?.trim() || `+${cleanPhone}`;
	const technicalJid = conversation.jid || `${cleanPhone}@s.whatsapp.net`;
	const initials = (conversation.name?.trim() || cleanPhone).slice(0, 1).toLocaleUpperCase();
	const profilePictureUrl = conversation.profile_picture_url;

	const handleSaveProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		if (savingProfile) return;
		setSavingProfile(true);
		try {
			const res = await fetch(`/api/conversations/${conversation.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: profileName }),
			});
			if (res.ok) {
				const updated = await res.json();
				onConversationUpdated?.(updated);
			} else {
				console.error("[profile] Error guardando perfil del contacto.");
			}
		} catch (error) {
			console.error("[profile] Error de red guardando perfil:", error);
		} finally {
			setSavingProfile(false);
		}
	};

	return (
		<div className="relative flex flex-col h-full bg-background rounded-r-3xl overflow-hidden">
			
			{/* Cabecera del Panel de Conversación */}
			<div className="p-4 bg-background border-b border-outline-variant flex items-center justify-between shrink-0">
				<button
					type="button"
					onClick={() => setProfileOpen(true)}
					className="flex items-center gap-3 text-left rounded-2xl hover:bg-surface px-2 py-1 transition-colors"
					title="Abrir perfil del contacto"
				>
					{profilePictureUrl ? (
						<img
							src={profilePictureUrl}
							alt={displayName}
							className="w-10 h-10 rounded-full object-cover border border-primary/30 cursor-zoom-in hover:scale-105 transition-transform"
							onClick={(e) => {
								e.stopPropagation();
								setZoomImage(profilePictureUrl);
							}}
							title="Ver imagen en grande"
						/>
					) : (
						<div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-display font-bold">
							{initials || <UserIcon size={16} />}
						</div>
					)}
					<div className="flex flex-col">
						<span className="font-display text-sm font-bold text-on-surface">{displayName}</span>
					<span className="flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant/80 tracking-wider mt-0.5">
						<span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
						+{cleanPhone}
					</span>
				</div>
				</button>
				
				<div className="flex items-center gap-4">
					<ModeToggle
						conversationId={conversation.id}
						currentMode={conversation.mode}
						onModeChange={onModeChanged}
					/>
					
					<button
						onClick={handleArchive}
						disabled={archiving}
						className="px-3 py-1.5 text-primary hover:bg-primary/10 border border-primary rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
						title={conversation.is_archived ? "Desarchivar conversación para verla al frente" : "Archivar conversación para no verla al frente"}
					>
						<ArchiveIcon size={12} /> {conversation.is_archived ? "Desarchivar" : "Archivar"}
					</button>

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

			{profileOpen && (
				<div className="absolute inset-0 z-40 flex justify-end bg-black/20">
					<aside className="h-full w-[360px] bg-surface border-l border-outline-variant/30 shadow-2xl p-6 flex flex-col animate-fade-in">
						<div className="flex items-start justify-between mb-8">
							<div>
								<p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
									Perfil del cliente
								</p>
								<h3 className="font-display text-lg font-bold text-on-surface mt-1">
									{displayName}
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setProfileOpen(false)}
								className="w-8 h-8 rounded-full border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-bright"
								aria-label="Cerrar perfil"
							>
								×
							</button>
						</div>

						<div className="flex flex-col items-center mb-8">
							{profilePictureUrl ? (
								<img
									src={profilePictureUrl}
									alt={displayName}
									className="w-20 h-20 rounded-full object-cover border border-primary/30 mb-3 cursor-zoom-in hover:scale-105 transition-transform"
									onClick={() => setZoomImage(profilePictureUrl)}
									title="Ver imagen en grande"
								/>
							) : (
								<div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-display text-2xl font-bold mb-3">
									{initials || <UserIcon size={28} />}
								</div>
							)}
							<p className="font-semibold text-on-surface">{displayName}</p>
							<p className="font-mono text-xs text-on-surface-variant mt-1">+{cleanPhone}</p>
						</div>

						<form onSubmit={handleSaveProfile} className="space-y-5">
							<label className="block">
								<span className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
									<EditIcon size={12} /> Nombre personalizado
								</span>
								<input
									value={profileName}
									onChange={(event) => setProfileName(event.target.value)}
									placeholder="Ej: Cliente mayorista Santo Domingo"
									className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm text-on-surface focus:outline-none focus:border-primary"
								/>
							</label>

							<div className="rounded-2xl border border-outline-variant/30 bg-background/60 p-4 space-y-3 text-xs">
								<div>
									<span className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">
										<PhoneIcon size={12} /> Teléfono
									</span>
									<p className="font-mono text-on-surface">+{cleanPhone}</p>
								</div>
								<div>
									<span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
										ID técnico
									</span>
									<p className="font-mono text-on-surface-variant break-all mt-1">
										{technicalJid}
									</p>
								</div>
							</div>

							<button
								type="submit"
								disabled={savingProfile}
								className="w-full py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-50"
							>
								{savingProfile ? "Guardando..." : "Guardar cliente"}
							</button>
						</form>
					</aside>
				</div>
			)}

			{/* Contenedor de Mensajes con Scroll y Botón Flotante */}
			<div className="flex-1 min-h-0 relative">
				<div
					ref={chatContainerRef}
					className="h-full overflow-y-auto p-6 flex flex-col gap-4 bg-background/50"
				>
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

				{/* Botón Flotante para bajar */}
				{showScrollDown && (
					<button
						onClick={scrollToBottom}
						className="absolute bottom-4 right-6 w-10 h-10 rounded-full bg-surface border border-outline-variant text-primary hover:text-primary-bright hover:bg-surface-bright flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 animate-fade-in z-20"
						title="Ir al final de la conversación"
					>
						<ArrowDownIcon size={18} />
					</button>
				)}
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
						<div className="relative flex-1">
							{showRepliesDropdown && filteredReplies.length > 0 && (
								<div className="absolute bottom-full mb-2.5 left-0 w-full bg-surface-bright/95 border border-outline-variant/60 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden max-h-[200px] overflow-y-auto z-30 animate-fade-in flex flex-col py-1.5 text-on-surface">
									{filteredReplies.map((reply, idx) => (
										<div
											key={reply.id}
											onClick={() => handleSelectReply(reply.text)}
											className={`px-4 py-2 text-xs flex justify-between items-center cursor-pointer transition-colors ${
												idx === activeIndex
													? "bg-primary/10 text-primary font-bold"
													: "text-on-surface-variant hover:bg-surface-bright"
											}`}
										>
											<span className="font-semibold">{reply.text}</span>
											<span className="text-[10px] font-mono text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/15 font-bold">
												/{reply.shortcut}
											</span>
										</div>
									))}
								</div>
							)}
							<input
								ref={inputRef}
								type="text"
								value={text}
								onChange={(e) => setText(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Escribí un mensaje en modo Humano... (usa / para respuestas rápidas)"
								disabled={sending}
								className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-full text-xs focus:outline-none focus:border-primary/50 transition-all duration-200 disabled:opacity-50 text-on-surface placeholder-on-surface-variant/50"
							/>
						</div>
						<button
							type="submit"
							disabled={sending || !text.trim()}
							className="w-10 h-10 flex items-center justify-center bg-transparent text-primary hover:bg-surface rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
						>
							{sending ? "..." : <ArrowRightIcon size={18} />}
						</button>
					</form>
				)}
			</div>

			{zoomImage && (
				<div 
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-300"
					onClick={() => setZoomImage(null)}
				>
					<div 
						className="relative w-[90vw] h-[90vw] max-w-[480px] max-h-[480px] p-1.5 bg-surface-container border border-outline-variant/40 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center animate-[scaleIn_0.2s_ease-out]"
						onClick={(e) => e.stopPropagation()}
					>
						<img 
							src={zoomImage} 
							alt="Contacto foto" 
							className="w-full h-full object-cover rounded-2xl animate-fade-in"
						/>
						<button 
							className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white font-display text-xl font-bold focus:outline-none transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
							onClick={() => setZoomImage(null)}
						>
							×
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
