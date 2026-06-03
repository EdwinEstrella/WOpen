"use client";

import { useState, useEffect } from "react";
import { KeyIcon, MailIcon, BellIcon } from "./Icons.tsx";

export default function SettingsPanel() {
	const [settings, setSettings] = useState<Record<string, any>>({});
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const loadSettings = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/settings");
			if (res.ok) {
				const data = await res.json();
				setSettings(data);
			}
		} catch (error) {
			console.error("[settings] Error cargando configuraciones:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadSettings();
	}, []);

	const handleSave = async (e: { preventDefault: () => void }) => {
		e.preventDefault();
		setSaving(true);
		try {
			const res = await fetch("/api/settings", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(settings),
			});
			if (res.ok) {
				const data = await res.json();
				setSettings(data.settings);
				alert("Ajustes guardados correctamente.");
			} else {
				alert("Error al guardar los ajustes.");
			}
		} catch (error) {
			console.error("[settings] Error de red guardando ajustes:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleChange = (key: string, value: any) => {
		setSettings((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	if (loading && Object.keys(settings).length === 0) {
		return (
			<div className="flex items-center justify-center p-8 text-xs text-on-surface-variant/70 font-semibold">
				Cargando ajuste…
			</div>
		);
	}

	return (
		<div className="glass-panel rounded-3xl p-6 max-w-3xl mx-auto w-full shadow-2xl flex flex-col max-h-full overflow-hidden">
			{/* Encabezado */}
			<div className="border-b border-outline-variant/10 pb-4 mb-6 shrink-0">
				<h2 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">
					Ajustes del Sistema
				</h2>
				<span className="text-[10px] text-on-surface-variant/80 font-medium">
					Configurá la palabra de activación y las políticas de seguimiento
				</span>
			</div>

			{/* Formulario */}
			<form
				onSubmit={handleSave}
				className="flex-1 overflow-y-auto pr-1 space-y-6"
			>
				{/* Grupo 1: Palabras Clave */}
				<div className="bg-surface/80 border border-outline-variant/20 p-5 rounded-2xl space-y-4">
					<h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<KeyIcon className="text-primary" size={14} /> Palabras Clave
						(Control del Dueño)
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="bot_on_keyword" className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
								Prender Bot (Keyword)
							</label>
							<input
								id="bot_on_keyword"
								type="text"
								value={settings.bot_on_keyword || ""}
								onChange={(e) => handleChange("bot_on_keyword", e.target.value)}
								placeholder="Ej: ok."
								className="px-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
								required
							/>
						</div>
					</div>

					<div className="flex items-center gap-3 mt-4 border-t border-outline-variant/10 pt-4">
						<input
							type="checkbox"
							id="keyword_case_sensitive"
							checked={!!settings.keyword_case_sensitive}
							onChange={(e) =>
								handleChange("keyword_case_sensitive", e.target.checked)
							}
							className="size-4 rounded bg-surface-container-low border border-outline-variant/30 text-primary focus:ring-0"
						/>
						<label
							htmlFor="keyword_case_sensitive"
							className="text-xs text-on-surface-variant font-semibold select-none cursor-pointer"
						>
							Sensible a mayúsculas/minúsculas para coincidencia exacta
						</label>
					</div>
				</div>

				{/* Grupo 3: Seguimientos Automáticos */}
				<div className="bg-surface/80 border border-outline-variant/20 p-5 rounded-2xl space-y-4">
					<h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<MailIcon className="text-primary" size={14} /> Seguimientos
						Automáticos (Follow-Ups)
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="followup_interval_hours" className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
								Intervalo de evaluación (horas)
							</label>
							<input
								id="followup_interval_hours"
								type="number"
								min="1"
								value={settings.followup_interval_hours || 12}
								onChange={(e) =>
									handleChange(
										"followup_interval_hours",
										Number(e.target.value),
									)
								}
								className="px-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="followup_min_hours_after_assistant" className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
								Espera tras mensaje de IA (horas)
							</label>
							<input
								id="followup_min_hours_after_assistant"
								type="number"
								min="1"
								value={settings.followup_min_hours_after_assistant || 12}
								onChange={(e) =>
									handleChange(
										"followup_min_hours_after_assistant",
										Number(e.target.value),
									)
								}
								className="px-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
								required
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-outline-variant/10 pt-4">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="followup_max_attempts" className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
								Intentos máximos de seguimiento
							</label>
							<input
								id="followup_max_attempts"
								type="number"
								min="1"
								max="5"
								value={settings.followup_max_attempts || 2}
								onChange={(e) =>
									handleChange("followup_max_attempts", Number(e.target.value))
								}
								className="px-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="whatsapp_freeform_window_hours" className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
								Ventana libre de WhatsApp (horas)
							</label>
							<input
								id="whatsapp_freeform_window_hours"
								type="number"
								min="1"
								value={settings.whatsapp_freeform_window_hours || 24}
								onChange={(e) =>
									handleChange(
										"whatsapp_freeform_window_hours",
										Number(e.target.value),
									)
								}
								className="px-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
								required
							/>
						</div>
					</div>

					<div className="flex items-center gap-3 mt-4 border-t border-outline-variant/10 pt-4">
						<input
							type="checkbox"
							id="block_outside_24h_followups"
							checked={!!settings.block_outside_24h_followups}
							onChange={(e) =>
								handleChange("block_outside_24h_followups", e.target.checked)
							}
							className="size-4 rounded bg-surface-container-low border border-outline-variant/30 text-primary focus:ring-0"
						/>
						<label
							htmlFor="block_outside_24h_followups"
							className="text-xs text-on-surface-variant font-semibold select-none cursor-pointer"
						>
							Bloquear seguimientos fuera de la ventana de 24 horas (Anti-Spam)
						</label>
					</div>
				</div>

				{/* Grupo 4: Telegram */}
				<div className="bg-surface/80 border border-outline-variant/20 p-5 rounded-2xl space-y-3">
					<h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<BellIcon className="text-primary" size={14} /> Canal de Alertas
						(Telegram)
					</h3>
					<p className="text-[9px] text-on-surface-variant/80">
						Las credenciales se administran de manera segura desde las variables
						de entorno de tu servidor (.env.local)
					</p>

					<div className="flex items-center gap-2.5 bg-primary/10 border border-primary/20 text-primary text-xs p-3 rounded-xl">
						<BellIcon size={14} className="animate-bounce" />
						<span>
							<b>Estado de Alertas:</b> Integración de notificaciones de
							Telegram activa en el backend.
						</span>
					</div>
				</div>

				{/* Botón Guardar */}
				<div className="flex justify-end gap-3 border-t border-outline-variant/10 pt-4 shrink-0">
					<button
						type="submit"
						disabled={saving}
						className="px-8 py-2.5 bg-primary text-on-primary rounded-xl font-display text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-50 glow-active"
					>
						{saving ? "Guardand…" : "Guardar Cambios"}
					</button>
				</div>
			</form>
		</div>
	);
}
