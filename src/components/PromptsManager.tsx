"use client";

import { useState, useEffect } from "react";
import { PlusIcon, EditIcon, TrashIcon, RobotIcon } from "./Icons.tsx";
import type { SystemPromptRow } from "../lib/db.ts";

export default function PromptsManager() {
	const [prompts, setPrompts] = useState<SystemPromptRow[]>([]);
	const [loading, setLoading] = useState(false);
	
	// Estado del formulario de creación/edición
	const [editId, setEditId] = useState<number | null>(null);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [formVisible, setFormVisible] = useState(false);

	const loadPrompts = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/prompts");
			if (res.ok) {
				const data = await res.json();
				setPrompts(data);
			}
		} catch (error) {
			console.error("[prompts] Error cargando prompts:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadPrompts();
	}, []);

	// Enviar guardar prompt (Crear o Editar)
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || !content.trim()) return;

		try {
			const method = editId ? "PUT" : "POST";
			const body = editId
				? { id: editId, title: title.trim(), content: content.trim() }
				: { title: title.trim(), content: content.trim() };

			const res = await fetch("/api/prompts", {
				method,
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});

			if (res.ok) {
				setTitle("");
				setContent("");
				setEditId(null);
				setFormVisible(false);
				await loadPrompts();
			} else {
				const data = await res.json();
				alert(data.error || "Ocurrió un error al guardar el prompt.");
			}
		} catch (error) {
			console.error("[prompts] Error guardando prompt:", error);
		}
	};

	// Marcar un prompt específico como ACTIVO
	const handleSetActive = async (id: number) => {
		try {
			const res = await fetch("/api/prompts", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "set_active", id }),
			});
			if (res.ok) {
				await loadPrompts();
			}
		} catch (error) {
			console.error("[prompts] Error activando prompt:", error);
		}
	};

	// Iniciar la edición de un prompt
	const startEdit = (prompt: SystemPromptRow) => {
		setEditId(prompt.id);
		setTitle(prompt.title);
		setContent(prompt.content);
		setFormVisible(true);
	};

	// Eliminar prompt
	const handleDelete = async (id: number) => {
		if (!confirm("¿Seguro que querés borrar este prompt del sistema?")) return;
		try {
			const res = await fetch(`/api/prompts?id=${id}`, { method: "DELETE" });
			if (res.ok) {
				await loadPrompts();
			} else {
				const data = await res.json();
				alert(data.error || "No se pudo borrar el prompt.");
			}
		} catch (error) {
			console.error("[prompts] Error borrando prompt:", error);
		}
	};

	return (
		<div className="glass-panel rounded-3xl p-6 max-w-4xl mx-auto w-full shadow-2xl flex flex-col max-h-full overflow-hidden">
			
			{/* Encabezado */}
			<div className="flex items-center justify-between border-b border-outline-variant/10 pb-4 mb-6 shrink-0">
				<div className="flex flex-col">
					<h2 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">Gestión de System Prompts</h2>
					<span className="text-[10px] text-on-surface-variant/80 font-medium">Configurá el comportamiento de la IA en tiempo real</span>
				</div>
				
				{!formVisible && (
					<button
						onClick={() => {
							setEditId(null);
							setTitle("");
							setContent("");
							setFormVisible(true);
						}}
						className="px-4 py-2 bg-primary text-on-primary rounded-xl font-display text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 glow-active flex items-center gap-1.5"
					>
						<PlusIcon size={12} /> Nuevo Prompt
					</button>
				)}
			</div>

			{/* Contenido con Scroll para Formularios y Listas */}
			<div className="flex-1 overflow-y-auto space-y-6 pr-1">
				
				{/* Formulario de Alta / Modificación */}
				{formVisible && (
					<form onSubmit={handleSubmit} className="bg-surface/80 border border-outline-variant/20 p-6 rounded-2xl animate-fade-in space-y-4">
						<h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
							{editId ? (
								<>
									<EditIcon size={14} className="text-primary" /> Editar Prompt
								</>
							) : (
								<>
									<PlusIcon size={14} className="text-primary" /> Crear Nuevo Prompt
								</>
							)}
						</h3>
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-1.5">
								<label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Título Descriptivo</label>
								<input
									type="text"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Ej: Asistente Inmobiliario - Tono Formal"
									className="px-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-on-surface"
									required
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Instrucciones del Sistema (System Prompt)</label>
								<textarea
									value={content}
									onChange={(e) => setContent(e.target.value)}
									placeholder="Ej: Eres un asistente virtual que responde de forma amable..."
									rows={8}
									className="px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-on-surface leading-relaxed"
									required
								/>
							</div>
							<div className="flex items-center gap-3 justify-end mt-2">
								<button
									type="button"
									onClick={() => setFormVisible(false)}
									className="px-4 py-2 border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright rounded-xl font-display text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="px-5 py-2 bg-primary text-on-primary rounded-xl font-display text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 glow-active"
								>
									{editId ? "Actualizar" : "Crear"}
								</button>
							</div>
						</div>
					</form>
				)}

				{/* Listado de Prompts */}
				{loading && prompts.length === 0 ? (
					<div className="flex items-center justify-center p-8 text-xs text-on-surface-variant/70 font-medium">
						Cargando prompts...
					</div>
				) : (
					<div className="flex flex-col gap-4">
						{prompts.map((prompt) => (
							<div
								key={prompt.id}
								className={`border rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 ${
									prompt.is_active
										? "border-primary bg-primary/5 glow-active"
										: "border-outline-variant/10 bg-surface-container-low/20 hover:border-outline-variant/30"
								}`}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<h4 className="text-xs font-bold text-on-surface">{prompt.title}</h4>
										{prompt.is_active && (
											<span className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
												<RobotIcon size={8} /> Activo
											</span>
										)}
									</div>

									{/* Acciones */}
									<div className="flex items-center gap-3">
										{!prompt.is_active && (
											<button
												onClick={() => handleSetActive(prompt.id)}
												className="px-3 py-1.5 border border-primary text-primary hover:bg-primary/10 rounded-xl font-display text-[9px] font-extrabold uppercase tracking-wider transition-all duration-200 flex items-center gap-1"
											>
												<span>Activar</span>
											</button>
										)}

										<button
											onClick={() => startEdit(prompt)}
											className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright rounded-lg text-xs transition-colors flex items-center justify-center"
											title="Editar prompt"
										>
											<EditIcon size={12} />
										</button>

										{!prompt.is_active && (
											<button
												onClick={() => handleDelete(prompt.id)}
												className="p-1.5 text-error/80 hover:text-error hover:bg-error/15 rounded-lg text-xs transition-colors flex items-center justify-center"
												title="Eliminar prompt"
											>
												<TrashIcon size={12} />
											</button>
										)}
									</div>
								</div>

								{/* Editor View */}
								<div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-3.5 text-[11px] font-mono text-on-surface-variant max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
									{prompt.content}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
