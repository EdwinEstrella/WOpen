import React from "react";
import {
	PlusIcon,
	MessagesIcon,
	ClockIcon,
	RobotIcon,
	TargetIcon
} from "./Icons.tsx";

export default function AutomationsOverview() {
	return (
		<div className="flex-1 flex flex-col h-full overflow-hidden">
			{/* Canvas Header */}
			<div className="flex justify-between items-center mb-6 shrink-0">
				<div>
					<h2 className="font-display text-lg font-bold text-on-surface">Constructor de Automatizaciones</h2>
					<p className="text-xs text-on-surface-variant mt-1">Definí secuencias de flujos lógicos guiados por inteligencia artificial</p>
				</div>
				<div className="flex gap-2">
					<button type="button" className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant/30 text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-colors active:scale-95">
						📂 Cargar Plantilla
					</button>
					<button type="button" className="px-4 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors active:scale-95 glow-active flex items-center gap-1.5">
						<PlusIcon size={12} /> Nuevo Flujo
					</button>
				</div>
			</div>

			{/* Canvas Body */}
			<div className="flex-1 glass-panel rounded-2xl overflow-hidden relative flex min-h-[400px]">
				
				{/* Nodes Sidebar */}
				<div className="w-64 border-r border-outline-variant/10 bg-surface-container-low/30 p-4 space-y-4 flex flex-col">
					<h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Bloques Disponibles</h3>
					
					{/* Block Triggers */}
					<div className="space-y-2">
						<span className="text-[10px] font-bold text-primary/80 uppercase">Disparadores</span>
						<div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 hover:border-primary/40 cursor-grab transition-all flex items-center gap-2.5 group">
							<MessagesIcon className="text-primary" size={14} />
							<span className="text-xs text-on-surface group-hover:text-primary font-medium">Mensaje Entrante</span>
						</div>
						<div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 hover:border-primary/40 cursor-grab transition-all flex items-center gap-2.5 group">
							<ClockIcon className="text-primary" size={14} />
							<span className="text-xs text-on-surface group-hover:text-primary font-medium">Intervalo de Espera</span>
						</div>
					</div>

					{/* Block Actions */}
					<div className="space-y-2">
						<span className="text-[10px] font-bold text-secondary/80 uppercase">Acciones IA & WhatsApp</span>
						<div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 hover:border-secondary/40 cursor-grab transition-all flex items-center gap-2.5 group">
							<MessagesIcon className="text-secondary" size={14} />
							<span className="text-xs text-on-surface group-hover:text-secondary font-medium">Enviar WhatsApp</span>
						</div>
						<div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 hover:border-secondary/40 cursor-grab transition-all flex items-center gap-2.5 group">
							<RobotIcon className="text-secondary" size={14} />
							<span className="text-xs text-on-surface group-hover:text-secondary font-medium">Preguntar a la IA</span>
						</div>
						<div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 hover:border-secondary/40 cursor-grab transition-all flex items-center gap-2.5 group">
							<TargetIcon className="text-secondary" size={14} />
							<span className="text-xs text-on-surface group-hover:text-secondary font-medium">Asignar Etiqueta</span>
						</div>
					</div>
				</div>

				{/* Editor Area */}
				<div className="flex-1 bg-surface-container-lowest/40 relative overflow-hidden flex items-center justify-center p-8">
					
					{/* Grid Background Effect */}
					<div className="absolute inset-0 bg-[linear-gradient(rgba(78,222,163,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(78,222,163,0.03)_1px,transparent_1px)] bg-[size:24px_24px]"></div>

					{/* SVG Connector Lines */}
					<svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
						{/* Connection 1 to 2 */}
						<path
							d="M 280,180 C 340,180 340,180 400,180"
							fill="none"
							stroke="#4edea3"
							strokeWidth="2"
							strokeDasharray="4"
							className="connection-line"
							style={{ strokeDashoffset: 100, animation: "dash 20s linear infinite" }}
						/>
						{/* Connection 2 to 3 */}
						<path
							d="M 580,180 C 640,180 640,280 700,280"
							fill="none"
							stroke="#4edea3"
							strokeWidth="2"
							strokeDasharray="4"
							className="connection-line"
							style={{ strokeDashoffset: 100, animation: "dash 20s linear infinite" }}
						/>
					</svg>

					{/* Visual Nodes Canvas Stack */}
					<div className="relative z-10 flex items-center gap-24 h-full w-full justify-center">
						
						{/* Node 1: Trigger */}
						<div className="w-64 glass-panel rounded-2xl p-5 border-l-4 border-l-primary flex flex-col gap-3 shadow-xl hover:border-primary/50 transition-colors">
							<div className="flex justify-between items-center">
								<span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold uppercase tracking-wider">
									Disparador
								</span>
								<span className="text-xs text-on-surface-variant font-mono">ID: node_01</span>
							</div>
							<div>
								<h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
									<MessagesIcon className="text-primary" size={12} /> Mensaje Entrante
								</h4>
								<p className="text-[10px] text-on-surface-variant mt-1">Cualquier interacción inicial del cliente</p>
							</div>
							<div className="border-t border-outline-variant/10 pt-2 flex items-center gap-1.5">
								<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
								<span className="text-[10px] text-on-surface-variant">Esperando mensaje...</span>
							</div>
						</div>

						{/* Node 2: AI Evaluation */}
						<div className="w-64 glass-panel rounded-2xl p-5 border-l-4 border-l-primary flex flex-col gap-3 shadow-xl hover:border-primary/50 transition-colors">
							<div className="flex justify-between items-center">
								<span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold uppercase tracking-wider">
									Proceso IA
								</span>
								<span className="text-xs text-on-surface-variant font-mono">ID: node_02</span>
							</div>
							<div>
								<h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
									<RobotIcon className="text-primary" size={12} /> Consultar Prompt Base
								</h4>
								<p className="text-[10px] text-on-surface-variant mt-1">Evalúa si es consulta de venta o reclamo</p>
							</div>
							<div className="border-t border-outline-variant/10 pt-2 flex items-center justify-between">
								<span className="text-[10px] text-on-surface-variant">System Prompt: Venta Directa</span>
								<span className="text-primary text-[10px] font-bold">Configurado</span>
							</div>
						</div>

						{/* Node 3: Custom Action (WhatsApp) */}
						<div className="w-64 glass-panel rounded-2xl p-5 border-l-4 border-l-secondary flex flex-col gap-3 shadow-xl hover:border-secondary/50 transition-colors">
							<div className="flex justify-between items-center">
								<span className="px-2 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-[10px] text-secondary font-bold uppercase tracking-wider">
									Acción WhatsApp
								</span>
								<span className="text-xs text-on-surface-variant font-mono">ID: node_03</span>
							</div>
							<div>
								<h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
									<MessagesIcon className="text-secondary" size={12} /> Responder WhatsApp
								</h4>
								<p className="text-[10px] text-on-surface-variant mt-1">Despacha respuesta del bot al cliente</p>
							</div>
							<div className="border-t border-outline-variant/10 pt-2 flex items-center justify-between">
								<span className="text-[10px] text-on-surface-variant">Mensaje automático</span>
								<span className="text-secondary text-[10px] font-bold">Activo</span>
							</div>
						</div>

					</div>
				</div>

			</div>
		</div>
	);
}
