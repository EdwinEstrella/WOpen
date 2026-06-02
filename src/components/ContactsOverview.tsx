import React, { useState } from "react";

interface Contact {
	id: number;
	name: string;
	phone: string;
	status: "Leads" | "Cliente" | "Frío";
	mode: "AI" | "Human";
	tags: string[];
	lastInteraction: string;
}

export default function ContactsOverview() {
	const [contacts, setContacts] = useState<Contact[]>([
		{
			id: 1,
			name: "Edwin Estrella",
			phone: "+54 9 11 1234-5678",
			status: "Cliente",
			mode: "AI",
			tags: ["Interés Venta", "Premium"],
			lastInteraction: "Hace 5 minutos"
		},
		{
			id: 2,
			name: "María Belén",
			phone: "+54 9 11 8765-4321",
			status: "Leads",
			mode: "Human",
			tags: ["Soporte Técnico"],
			lastInteraction: "Hace 1 hora"
		},
		{
			id: 3,
			name: "Rodrigo Gómez",
			phone: "+54 9 341 555-9876",
			status: "Frío",
			mode: "AI",
			tags: ["Consulta General"],
			lastInteraction: "Hace 2 días"
		}
	]);

	return (
		<div className="flex-1 flex flex-col h-full overflow-hidden">
			{/* CRM Header */}
			<div className="flex justify-between items-center mb-6 shrink-0">
				<div>
					<h2 className="font-display text-lg font-bold text-on-surface">Gestión de Contactos CRM</h2>
					<p className="text-xs text-on-surface-variant mt-1">Administrá y categorizá los contactos y la intervención de IA por chat</p>
				</div>
				<div>
					<button className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors active:scale-95 glow-active">
						＋ Agregar Contacto
					</button>
				</div>
			</div>

			{/* Contact Table Grid */}
			<div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
				
				{/* Filters SubBar */}
				<div className="px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low/30 flex justify-between items-center shrink-0">
					<div className="flex items-center gap-4">
						<input
							type="text"
							placeholder="Buscar por nombre o teléfono..."
							className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-1.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all w-64 placeholder-on-surface-variant/50 text-on-surface"
						/>
						<select className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary">
							<option>Todos los Estados</option>
							<option>Leads</option>
							<option>Cliente</option>
							<option>Frío</option>
						</select>
					</div>
					<div className="text-xs text-on-surface-variant">
						Mostrando <strong className="text-primary font-semibold">{contacts.length}</strong> contactos
					</div>
				</div>

				{/* Table */}
				<div className="flex-1 overflow-y-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="border-b border-outline-variant/10 text-on-surface-variant text-[10px] font-bold uppercase tracking-wider bg-surface-container-lowest/20">
								<th className="px-6 py-4">Contacto</th>
								<th className="px-6 py-4">Teléfono</th>
								<th className="px-6 py-4">Categoría</th>
								<th className="px-6 py-4">Modo Bot</th>
								<th className="px-6 py-4">Etiquetas</th>
								<th className="px-6 py-4">Última Charla</th>
								<th className="px-6 py-4 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-outline-variant/10 text-xs">
							{contacts.map((contact) => (
								<tr key={contact.id} className="hover:bg-surface-container-low/20 transition-colors">
									<td className="px-6 py-4 font-semibold text-on-surface flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-display text-primary text-xs font-bold shrink-0">
											{contact.name.charAt(0)}
										</div>
										{contact.name}
									</td>
									<td className="px-6 py-4 text-on-surface-variant font-mono">{contact.phone}</td>
									<td className="px-6 py-4">
										<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
											contact.status === "Cliente"
												? "bg-primary/10 border border-primary/20 text-primary"
												: contact.status === "Leads"
												? "bg-secondary/10 border border-secondary/20 text-secondary"
												: "bg-outline/10 border border-outline/20 text-on-surface-variant"
										}`}>
											{contact.status}
										</span>
									</td>
									<td className="px-6 py-4">
										<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
											contact.mode === "AI"
												? "bg-primary/10 border border-primary/20 text-primary"
												: "bg-secondary/10 border border-secondary/20 text-secondary"
										}`}>
											🤖 {contact.mode}
										</span>
									</td>
									<td className="px-6 py-4 flex gap-1 flex-wrap">
										{contact.tags.map((tag, i) => (
											<span key={i} className="px-2 py-0.5 rounded bg-surface-container-high/60 border border-outline-variant/30 text-[10px] text-on-surface-variant">
												{tag}
											</span>
										))}
									</td>
									<td className="px-6 py-4 text-on-surface-variant/80">{contact.lastInteraction}</td>
									<td className="px-6 py-4 text-right">
										<button className="px-2 py-1 rounded hover:bg-surface-container-high text-primary hover:underline font-semibold">
											Ver Historial
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

			</div>
		</div>
	);
}
