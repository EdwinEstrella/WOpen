"use client";

import { useEffect, useState } from "react";

import type {
	AutomationActionType,
	AutomationConditionType,
	AutomationDefinition,
	AutomationRow,
} from "@/lib/automations";
import { PlusIcon } from "./Icons.tsx";

const conditionLabels: Record<AutomationConditionType, string> = {
	always: "Siempre",
	message_contains: "Mensaje contiene",
	conversation_mode: "Modo de conversaci?n",
};

const actionLabels: Record<AutomationActionType, string> = {
	send_whatsapp: "Enviar WhatsApp",
	switch_mode: "Cambiar modo",
	add_internal_note: "Nota interna",
};

function buildDefinition(input: {
	conditionType: AutomationConditionType;
	conditionValue: string;
	actionType: AutomationActionType;
	actionValue: string;
}): AutomationDefinition {
	return {
		trigger: { type: "incoming_message" },
		conditions: [
			input.conditionType === "always"
				? { type: "always" }
				: { type: input.conditionType, value: input.conditionValue.trim() },
		],
		actions: [{ type: input.actionType, value: input.actionValue.trim() }],
	};
}

export default function AutomationsOverview() {
	const [automations, setAutomations] = useState<AutomationRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [name, setName] = useState("");
	const [enabled, setEnabled] = useState(true);
	const [conditionType, setConditionType] = useState<AutomationConditionType>("always");
	const [conditionValue, setConditionValue] = useState("");
	const [actionType, setActionType] = useState<AutomationActionType>("send_whatsapp");
	const [actionValue, setActionValue] = useState("");

	const loadAutomations = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/automations");
			if (res.ok) setAutomations(await res.json());
		} catch (error) {
			console.error("[automations] Error cargando automatizaciones:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadAutomations();
	}, []);

	const resetForm = () => {
		setEditingId(null);
		setName("");
		setEnabled(true);
		setConditionType("always");
		setConditionValue("");
		setActionType("send_whatsapp");
		setActionValue("");
	};

	const startEdit = (automation: AutomationRow) => {
		const condition = automation.definition.conditions[0] ?? { type: "always" as const };
		const action = automation.definition.actions[0] ?? { type: "send_whatsapp" as const, value: "" };
		setEditingId(automation.id);
		setName(automation.name);
		setEnabled(automation.enabled);
		setConditionType(condition.type);
		setConditionValue(condition.value ?? "");
		setActionType(action.type);
		setActionValue(action.value ?? "");
	};

	const saveAutomation = async (event: React.FormEvent) => {
		event.preventDefault();
		const body = {
			id: editingId ?? undefined,
			name,
			enabled,
			definition: buildDefinition({ conditionType, conditionValue, actionType, actionValue }),
		};
		const res = await fetch("/api/automations", {
			method: editingId ? "PUT" : "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		if (res.ok) {
			resetForm();
			await loadAutomations();
			return;
		}
		const data = await res.json().catch(() => ({}));
		alert(data.error || "No se pudo guardar la automatizaci?n.");
	};

	const toggleEnabled = async (automation: AutomationRow) => {
		await fetch("/api/automations", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ id: automation.id, action: "set_enabled", enabled: !automation.enabled }),
		});
		await loadAutomations();
	};

	const deleteAutomation = async (id: number) => {
		if (!confirm("?Seguro que quer?s borrar esta automatizaci?n?")) return;
		await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
		if (editingId === id) resetForm();
		await loadAutomations();
	};

	return (
		<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[minmax(320px,420px)_1fr]">
			<form onSubmit={saveAutomation} className="glass-panel flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl p-5">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h2 className="font-display text-sm font-bold uppercase tracking-wider text-on-surface">
							{editingId ? "Editar automatizaci?n" : "Nueva automatizaci?n"}
						</h2>
						<p className="mt-1 text-xs text-on-surface-variant">Bloques seguros, sin SQL libre.</p>
					</div>
					<button type="button" onClick={resetForm} className="text-xs font-bold text-primary hover:underline">
						Limpiar
					</button>
				</div>

				<label className="flex flex-col gap-1.5">
					<span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Nombre</span>
					<input value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2 text-xs text-on-surface outline-none focus:border-primary" placeholder="Ej: Responder si pregunta precio" />
				</label>

				<div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40 p-4">
					<p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-primary">Disparador</p>
					<p className="text-xs font-semibold text-on-surface">Mensaje entrante</p>
					<p className="mt-1 text-[10px] text-on-surface-variant">Se eval?a cuando llega un WhatsApp del cliente.</p>
				</div>

				<label className="flex flex-col gap-1.5">
					<span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Condici?n</span>
					<select value={conditionType} onChange={(e) => setConditionType(e.target.value as AutomationConditionType)} className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2 text-xs text-on-surface outline-none focus:border-primary">
						<option value="always">Siempre</option>
						<option value="message_contains">Mensaje contiene</option>
						<option value="conversation_mode">Modo de conversaci?n</option>
					</select>
				</label>

				{conditionType !== "always" && (
					<label className="flex flex-col gap-1.5">
						<span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Valor de condici?n</span>
						<input value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} required className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2 text-xs text-on-surface outline-none focus:border-primary" placeholder={conditionType === "conversation_mode" ? "AI o HUMAN" : "Ej: precio"} />
					</label>
				)}

				<label className="flex flex-col gap-1.5">
					<span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Acci?n</span>
					<select value={actionType} onChange={(e) => setActionType(e.target.value as AutomationActionType)} className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2 text-xs text-on-surface outline-none focus:border-primary">
						<option value="send_whatsapp">Enviar WhatsApp</option>
						<option value="switch_mode">Cambiar modo</option>
						<option value="add_internal_note">Nota interna</option>
					</select>
				</label>

				<label className="flex flex-col gap-1.5">
					<span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Valor de acci?n</span>
					<textarea value={actionValue} onChange={(e) => setActionValue(e.target.value)} required rows={5} className="resize-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-xs text-on-surface outline-none focus:border-primary" placeholder={actionType === "switch_mode" ? "AI o HUMAN" : "Texto seguro de la acci?n"} />
				</label>

				<label className="flex items-center gap-2 text-xs font-semibold text-on-surface">
					<input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
					Automatizaci?n activa
				</label>

				<button type="submit" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-display text-[10px] font-bold uppercase tracking-wider text-on-primary glow-active">
					<PlusIcon size={12} /> {editingId ? "Guardar cambios" : "Crear automatizaci?n"}
				</button>
			</form>

			<div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-2xl p-5">
				<div className="mb-4 shrink-0">
					<h3 className="font-display text-sm font-bold uppercase tracking-wider text-on-surface">Automatizaciones</h3>
					<p className="mt-1 text-xs text-on-surface-variant">Flujos guardados con bloques predefinidos.</p>
				</div>

				<div className="flex-1 overflow-y-auto pr-1">
					{loading && automations.length === 0 ? (
						<p className="p-6 text-center text-xs text-on-surface-variant">Cargando automatizaciones?</p>
					) : automations.length === 0 ? (
						<p className="rounded-2xl border border-outline-variant/20 p-6 text-center text-xs text-on-surface-variant">Todav?a no hay automatizaciones reales.</p>
					) : (
						<div className="flex flex-col gap-3">
							{automations.map((automation) => {
								const condition = automation.definition.conditions[0];
								const action = automation.definition.actions[0];
								return (
									<div key={automation.id} className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/30 p-4">
										<div className="flex items-start justify-between gap-4">
											<div className="min-w-0">
												<p className="truncate text-sm font-bold text-on-surface">{automation.name}</p>
												<p className="mt-1 text-[10px] text-on-surface-variant">
													{conditionLabels[condition?.type ?? "always"]} ? {actionLabels[action?.type ?? "send_whatsapp"]}
												</p>
											</div>
											<span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${automation.enabled ? "border-primary/30 text-primary" : "border-outline-variant/30 text-on-surface-variant"}`}>
												{automation.enabled ? "Activa" : "Pausada"}
											</span>
										</div>
										<div className="mt-4 flex flex-wrap gap-2">
											<button type="button" onClick={() => startEdit(automation)} className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-[10px] font-bold uppercase text-on-surface-variant hover:text-on-surface">Editar</button>
											<button type="button" onClick={() => toggleEnabled(automation)} className="rounded-lg border border-primary/40 px-3 py-1.5 text-[10px] font-bold uppercase text-primary hover:bg-primary/10">{automation.enabled ? "Pausar" : "Activar"}</button>
											<button type="button" onClick={() => deleteAutomation(automation.id)} className="rounded-lg border border-error/40 px-3 py-1.5 text-[10px] font-bold uppercase text-error hover:bg-error/15">Eliminar</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
