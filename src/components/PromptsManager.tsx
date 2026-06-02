"use client";

import { useState, useEffect } from "react";
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
		<div className="bg-white border border-gray-100 rounded-3xl shadow-lg p-6 max-w-4xl mx-auto w-full">
			<div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
				<div className="flex flex-col">
					<h2 className="text-lg font-bold text-gray-800">Gestión de System Prompts</h2>
					<span className="text-[10px] text-gray-400 font-medium">Configurá el comportamiento de la IA en tiempo real</span>
				</div>
				
				{!formVisible && (
					<button
						onClick={() => {
							setEditId(null);
							setTitle("");
							setContent("");
							setFormVisible(true);
						}}
						className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs tracking-wider uppercase shadow-md transition-all duration-300 active:scale-95"
					>
						➕ Nuevo Prompt
					</button>
				)}
			</div>

			{/* Formulario de Alta / Modificación */}
			{formVisible && (
				<form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-100 p-6 rounded-2xl mb-8 animate-fade-in">
					<h3 className="text-sm font-bold text-gray-700 mb-4">{editId ? "✍️ Editar Prompt" : "✨ Crear Nuevo Prompt"}</h3>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Título descriptivo</label>
							<input
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Ej: Asistente Inmobiliario - Tono Formal"
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
								required
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Instrucciones del Sistema (System Prompt)</label>
							<textarea
								value={content}
								onChange={(e) => setContent(e.target.value)}
								placeholder="Ej: Eres un asistente virtual que responde de forma amable..."
								rows={8}
								className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500 bg-white"
								required
							/>
						</div>
						<div className="flex items-center gap-3 justify-end mt-2">
							<button
								type="button"
								onClick={() => setFormVisible(false)}
								className="px-4 py-2 border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300"
							>
								Cancelar
							</button>
							<button
								type="submit"
								className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs tracking-wider uppercase shadow-md transition-all duration-300 active:scale-95"
							>
								{editId ? "Actualizar" : "Crear"}
							</button>
						</div>
					</div>
				</form>
			)}

			{/* Listado de Prompts */}
			{loading && prompts.length === 0 ? (
				<div className="flex items-center justify-center p-8 text-xs text-gray-400">
					Cargando prompts...
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{prompts.map((prompt) => (
						<div
							key={prompt.id}
							className={`border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 ${
								prompt.is_active
									? "border-emerald-500 bg-emerald-50/20 shadow-sm"
									: "border-gray-100 bg-white hover:border-gray-200"
							}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<h4 className="font-bold text-sm text-gray-800">{prompt.title}</h4>
									{prompt.is_active && (
										<span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
											Activo
										</span>
									)}
								</div>

								{/* Selector / Radio Button para activar */}
								<div className="flex items-center gap-3">
									{!prompt.is_active && (
										<button
											onClick={() => handleSetActive(prompt.id)}
											className="px-3 py-1.5 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all duration-300"
										>
											⚡ Activar
										</button>
									)}

									<button
										onClick={() => startEdit(prompt)}
										className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-semibold"
										title="Editar prompt"
									>
										✏️
									</button>

									{!prompt.is_active && (
										<button
											onClick={() => handleDelete(prompt.id)}
											className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold"
											title="Eliminar prompt"
										>
											🗑️
										</button>
									)}
								</div>
							</div>

							<div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs font-mono text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
								{prompt.content}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
