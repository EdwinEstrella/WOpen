"use client";

import { useState, useEffect } from "react";

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

	const handleSave = async (e: React.FormEvent) => {
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
			<div className="flex items-center justify-center p-8 text-xs text-gray-400">
				Cargando ajustes...
			</div>
		);
	}

	return (
		<div className="bg-white border border-gray-100 rounded-3xl shadow-lg p-6 max-w-3xl mx-auto w-full">
			<div className="border-b border-gray-100 pb-4 mb-6">
				<h2 className="text-lg font-bold text-gray-800">Ajustes del Sistema</h2>
				<span className="text-[10px] text-gray-400 font-medium">Configurá las palabras clave, reactivaciones y políticas de seguimiento</span>
			</div>

			<form onSubmit={handleSave} className="flex flex-col gap-6">
				{/* Grupo 1: Palabras Clave del Dueño */}
				<div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
					<h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-4">🔑 Palabras Clave (Control del Dueño)</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Palabra para apagar el Bot</label>
							<input
								type="text"
								value={settings.bot_off_keyword || ""}
								onChange={(e) => handleChange("bot_off_keyword", e.target.value)}
								placeholder="Ej: bot off"
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
								required
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Palabra para prender el Bot</label>
							<input
								type="text"
								value={settings.bot_on_keyword || ""}
								onChange={(e) => handleChange("bot_on_keyword", e.target.value)}
								placeholder="Ej: ok."
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
								required
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200/50 pt-4">
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Modo de Coincidencia</label>
							<select
								value={settings.keyword_match_mode || "exact"}
								onChange={(e) => handleChange("keyword_match_mode", e.target.value)}
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
							>
								<option value="exact">Exacta (Debe ser el mensaje idéntico)</option>
								<option value="contains">Contiene (Debe contener la palabra)</option>
							</select>
						</div>
						<div className="flex items-center gap-3 mt-4">
							<input
								type="checkbox"
								id="keyword_case_sensitive"
								checked={!!settings.keyword_case_sensitive}
								onChange={(e) => handleChange("keyword_case_sensitive", e.target.checked)}
								className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
							/>
							<label htmlFor="keyword_case_sensitive" className="text-xs text-gray-600 font-semibold select-none">
								Sensible a mayúsculas/minúsculas
							</label>
						</div>
					</div>
				</div>

				{/* Grupo 2: Automatizaciones y Reactivaciones */}
				<div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
					<h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-4">🔄 Reactivación Automática</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Días para reactivación automática por respuesta del dueño</label>
							<input
								type="number"
								min="1"
								max="30"
								value={settings.owner_reactivation_days || 3}
								onChange={(e) => handleChange("owner_reactivation_days", Number(e.target.value))}
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
								required
							/>
							<span className="text-[9px] text-gray-400">Si intervenís en un chat humano, el bot se reactivará automáticamente después de estos días de inactividad</span>
						</div>
					</div>
				</div>

				{/* Grupo 3: Seguimientos Automáticos */}
				<div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
					<h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-4">✉️ Seguimientos Automáticos (Follow-Ups)</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Intervalo de evaluación (horas)</label>
							<input
								type="number"
								min="1"
								value={settings.followup_interval_hours || 6}
								onChange={(e) => handleChange("followup_interval_hours", Number(e.target.value))}
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
								required
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Tiempo mínimo de espera tras último mensaje de IA (horas)</label>
							<input
								type="number"
								min="1"
								value={settings.followup_min_hours_after_assistant || 24}
								onChange={(e) => handleChange("followup_min_hours_after_assistant", Number(e.target.value))}
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
								required
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200/50 pt-4">
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Máximo de intentos de seguimiento</label>
							<input
								type="number"
								min="1"
								max="5"
								value={settings.followup_max_attempts || 2}
								onChange={(e) => handleChange("followup_max_attempts", Number(e.target.value))}
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
								required
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-[10px] font-bold text-gray-500 uppercase">Ventana libre de WhatsApp (horas)</label>
							<input
								type="number"
								min="1"
								value={settings.whatsapp_freeform_window_hours || 24}
								onChange={(e) => handleChange("whatsapp_freeform_window_hours", Number(e.target.value))}
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
								required
							/>
						</div>
					</div>

					<div className="flex items-center gap-3 mt-4 border-t border-gray-200/50 pt-4">
						<input
							type="checkbox"
							id="block_outside_24h_followups"
							checked={!!settings.block_outside_24h_followups}
							onChange={(e) => handleChange("block_outside_24h_followups", e.target.checked)}
							className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
						/>
						<label htmlFor="block_outside_24h_followups" className="text-xs text-gray-600 font-semibold select-none">
							Bloquear seguimientos automáticos fuera de la ventana de 24 horas (Evita Spam)
						</label>
					</div>
				</div>

				{/* Grupo 4: Telegram (Solo lectura del estado de configuración) */}
				<div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
					<h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">📢 Canal de Notificaciones (Telegram)</h3>
					<p className="text-[10px] text-gray-400 mb-4">Configurá las credenciales en tu archivo .env.local para habilitar las alertas</p>
					
					<div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-xl">
						🔔 <b>Estado:</b> El servicio de notificaciones está configurado y activo en el backend.
					</div>
				</div>

				<div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
					<button
						type="submit"
						disabled={saving}
						className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs tracking-wider uppercase shadow-md transition-all duration-300 active:scale-95 disabled:opacity-50"
					>
						{saving ? "Guardando..." : "Guardar Cambios"}
					</button>
				</div>
			</form>
		</div>
	);
}
