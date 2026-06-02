import React from "react";

export default function DashboardOverview() {
	return (
		<div className="flex-1 overflow-y-auto pr-1">
			<div className="max-w-[1440px] mx-auto space-y-6">
				
				{/* KPI Bento Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
					
					{/* KPI 1: Active Conversations */}
					<div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
						<div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors"></div>
						<div className="flex justify-between items-start mb-4">
							<span className="font-display text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Conversaciones Activas</span>
							<span className="text-primary text-lg">💬</span>
						</div>
						<div>
							<div className="font-display text-4xl font-bold text-on-surface mb-2">542</div>
							<div className="flex items-center gap-2">
								<span className="flex items-center text-primary bg-primary/10 px-2 py-0.5 rounded text-xs font-semibold">
									📈 +12.5%
								</span>
								<span className="text-xs text-on-surface-variant">vs última hora</span>
							</div>
						</div>
						
						{/* Sparkline */}
						<div className="mt-4 h-8 flex items-end gap-1 opacity-60">
							<div className="w-full bg-primary/20 rounded-t-sm h-1/4"></div>
							<div className="w-full bg-primary/40 rounded-t-sm h-2/4"></div>
							<div className="w-full bg-primary/30 rounded-t-sm h-1/3"></div>
							<div className="w-full bg-primary/60 rounded-t-sm h-3/4"></div>
							<div className="w-full bg-primary/50 rounded-t-sm h-2/3"></div>
							<div className="w-full bg-primary rounded-t-sm h-full glow-active"></div>
						</div>
					</div>

					{/* KPI 2: AI Resolution Rate */}
					<div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
						<div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors"></div>
						<div className="flex justify-between items-start mb-4">
							<span className="font-display text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Resolución de IA</span>
							<span className="text-primary text-lg">⚡</span>
						</div>
						<div>
							<div className="font-display text-4xl font-bold text-on-surface mb-2">82%</div>
							<div className="flex items-center gap-2">
								<span className="flex items-center text-primary bg-primary/10 px-2 py-0.5 rounded text-xs font-semibold">
									📈 +3.2%
								</span>
								<span className="text-xs text-on-surface-variant">vs semana anterior</span>
							</div>
						</div>
						
						{/* Sparkline */}
						<div className="mt-4 h-8 flex items-end gap-1 opacity-60">
							<div className="w-full bg-primary/50 rounded-t-sm h-2/3"></div>
							<div className="w-full bg-primary/60 rounded-t-sm h-3/4"></div>
							<div className="w-full bg-primary/70 rounded-t-sm h-4/5"></div>
							<div className="w-full bg-primary/60 rounded-t-sm h-3/4"></div>
							<div className="w-full bg-primary/80 rounded-t-sm h-5/6"></div>
							<div className="w-full bg-primary rounded-t-sm h-full glow-active"></div>
						</div>
					</div>

					{/* KPI 3: Human Assisted */}
					<div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-secondary/40 transition-all duration-300">
						<div className="flex justify-between items-start mb-4">
							<span className="font-display text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Soporte Humano</span>
							<span className="text-secondary text-lg">👤</span>
						</div>
						<div>
							<div className="font-display text-4xl font-bold text-on-surface mb-2">124</div>
							<div className="flex items-center gap-2">
								<span className="flex items-center text-secondary bg-secondary/10 px-2 py-0.5 rounded text-xs font-semibold">
									📉 -5.1%
								</span>
								<span className="text-xs text-on-surface-variant">vs semana anterior</span>
							</div>
						</div>
						
						{/* Sparkline */}
						<div className="mt-4 h-8 flex items-end gap-1 opacity-60">
							<div className="w-full bg-secondary/80 rounded-t-sm h-5/6"></div>
							<div className="w-full bg-secondary/70 rounded-t-sm h-4/5"></div>
							<div className="w-full bg-secondary/50 rounded-t-sm h-2/3"></div>
							<div className="w-full bg-secondary/60 rounded-t-sm h-3/4"></div>
							<div className="w-full bg-secondary/40 rounded-t-sm h-1/2"></div>
							<div className="w-full bg-secondary rounded-t-sm h-1/3"></div>
						</div>
					</div>

					{/* KPI 4: Pending Responses */}
					<div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-error/40 transition-all duration-300">
						<div className="flex justify-between items-start mb-4">
							<span className="font-display text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Respuestas Pendientes</span>
							<span className="text-error text-lg">⏳</span>
						</div>
						<div>
							<div className="font-display text-4xl font-bold text-on-surface mb-2">18</div>
							<div className="flex items-center gap-2">
								<span className="flex items-center text-error bg-error/10 px-2 py-0.5 rounded text-xs font-semibold">
									⚠️ Requiere Acción
								</span>
							</div>
						</div>
						
						{/* Sparkline */}
						<div className="mt-4 h-8 flex items-end gap-1 opacity-60">
							<div className="w-full bg-error/20 rounded-t-sm h-1/4"></div>
							<div className="w-full bg-error/30 rounded-t-sm h-1/3"></div>
							<div className="w-full bg-error/40 rounded-t-sm h-1/2"></div>
							<div className="w-full bg-error/20 rounded-t-sm h-1/4"></div>
							<div className="w-full bg-error/60 rounded-t-sm h-2/3"></div>
							<div className="w-full bg-error rounded-t-sm h-full shadow-[0_0_10px_rgba(255,180,171,0.2)]"></div>
						</div>
					</div>
				</div>

				{/* Lower Section Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					
					{/* Activity Timeline */}
					<div className="glass-panel rounded-2xl p-0 flex flex-col lg:col-span-1">
						<div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30 rounded-t-2xl">
							<h2 className="font-display text-sm font-bold text-on-surface">Actividad en Vivo</h2>
							<button className="text-primary text-xs hover:underline font-semibold">Ver Todo</button>
						</div>
						<div className="p-6 flex-1 overflow-y-auto space-y-6 max-h-[360px]">
							{/* Item 1 */}
							<div className="flex gap-4 relative">
								<div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-outline-variant/20"></div>
								<div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 z-10 glow-active">
									<span className="text-xs text-primary">🤖</span>
								</div>
								<div>
									<div className="text-xs text-on-surface font-semibold mb-1">IA respondió a cliente</div>
									<div className="text-xs text-on-surface-variant line-clamp-2">"Tu pedido #8921 ya fue despachado y llegará mañana al mediodía..."</div>
									<div className="text-[10px] text-on-surface-variant/60 mt-1">Ahora mismo • WhatsApp</div>
								</div>
							</div>
							{/* Item 2 */}
							<div className="flex gap-4 relative">
								<div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-outline-variant/20"></div>
								<div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0 z-10">
									<span className="text-xs text-secondary">👤</span>
								</div>
								<div>
									<div className="text-xs text-on-surface font-semibold mb-1">Agente intervino chat</div>
									<div className="text-xs text-on-surface-variant">Soporte tomó el control de la conversación de Edwin Estrella.</div>
									<div className="text-[10px] text-on-surface-variant/60 mt-1">Hace 2 min • Intervención</div>
								</div>
							</div>
							{/* Item 3 */}
							<div className="flex gap-4 relative">
								<div className="w-8 h-8 rounded-full bg-tertiary-container/10 border border-tertiary-container/20 flex items-center justify-center shrink-0 z-10">
									<span className="text-xs text-tertiary-container">🎯</span>
								</div>
								<div>
									<div className="text-xs text-on-surface font-semibold mb-1">Nuevo Lead Calificado</div>
									<div className="text-xs text-on-surface-variant">Cliente usó palabra clave de alta intención "precios y planes".</div>
									<div className="text-[10px] text-on-surface-variant/60 mt-1">Hace 15 min • Regla IA</div>
								</div>
							</div>
						</div>
					</div>

					{/* AI Performance Panel */}
					<div className="glass-panel rounded-2xl p-0 flex flex-col lg:col-span-2">
						<div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30 rounded-t-2xl">
							<h2 className="font-display text-sm font-bold text-on-surface">Métricas de Rendimiento de IA</h2>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-1.5">
									<span className="w-2 h-2 rounded-full bg-primary"></span>
									<span className="text-xs text-on-surface-variant font-medium">Volumen</span>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="w-2 h-2 rounded-full bg-secondary"></span>
									<span className="text-xs text-on-surface-variant font-medium">Precisión</span>
								</div>
							</div>
						</div>
						<div className="p-6 flex-1 flex flex-col justify-center min-h-[280px]">
							<div className="flex flex-col items-center justify-center text-center text-on-surface-variant space-y-3">
								<span className="text-4xl">📈</span>
								<h3 className="text-sm font-bold text-on-surface">Panel de Analíticas Activo</h3>
								<p className="text-xs max-w-sm">
									La precisión de respuesta del bot se mantiene en <strong className="text-primary font-semibold">96.4%</strong> esta semana con un total de 1,421 mensajes autogestionados de manera estable.
								</p>
							</div>
						</div>
					</div>
					
				</div>
			</div>
		</div>
	);
}
