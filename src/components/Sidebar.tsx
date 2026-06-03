"use client";

import React from "react";
import {
	RobotIcon,
	DashboardIcon,
	MessagesIcon,
	BrainIcon,
	ZapIcon,
	UsersIcon,
	SettingsIcon,
} from "./Icons.tsx";

type Tab =
	| "dashboard"
	| "chats"
	| "prompts"
	| "automations"
	| "contacts"
	| "settings";

interface SidebarProps {
	activeTab: Tab;
	setActiveTab: (tab: Tab) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
	return (
		<nav className="fixed left-0 top-0 h-screen w-[280px] bg-surface/95 border-r border-outline-variant/30 flex flex-col py-6 px-4 z-50 shadow-[20px_0_60px_rgba(12,83,58,0.14)] backdrop-blur-xl">
			{/* Header de Marca */}
			<div className="flex items-center gap-3 mb-10 px-2 shrink-0">
				<div className="size-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 border border-primary/40 glow-active">
					<RobotIcon className="text-on-primary" size={20} />
				</div>
				<div>
					<h1 className="font-display text-base font-bold text-primary leading-tight">
						Bot Personal
					</h1>
					<p className="text-[10px] font-semibold text-on-surface-variant/70 uppercase tracking-wide mt-0.5">
						WhatsApp CRM
					</p>
				</div>
			</div>

			{/* Links de Navegación */}
			<div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
				{/* Dashboard overview */}
				<button
					type="button"
					onClick={() => setActiveTab("dashboard")}
					className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
						activeTab === "dashboard"
							? "text-primary border border-primary bg-primary/10 rounded-xl"
							: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
					}`}
				>
					<DashboardIcon size={16} />
					<span>Dashboard</span>
				</button>

				{/* Conversations Workspace */}
				<button
					type="button"
					onClick={() => setActiveTab("chats")}
					className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
						activeTab === "chats"
							? "text-primary border border-primary bg-primary/10 rounded-xl"
							: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
					}`}
				>
					<MessagesIcon size={16} />
					<span>Conversaciones</span>
				</button>

				{/* AI System Prompts */}
				<button
					type="button"
					onClick={() => setActiveTab("prompts")}
					className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
						activeTab === "prompts"
							? "text-primary border border-primary bg-primary/10 rounded-xl"
							: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
					}`}
				>
					<BrainIcon size={16} />
					<span>AI Prompts</span>
				</button>

				{/* Workflow Builder */}
				<button
					type="button"
					onClick={() => setActiveTab("automations")}
					className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
						activeTab === "automations"
							? "text-primary border border-primary bg-primary/10 rounded-xl"
							: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
					}`}
				>
					<ZapIcon size={16} />
					<span>Automatizaciones</span>
				</button>

				{/* Contacts CRM */}
				<button
					type="button"
					onClick={() => setActiveTab("contacts")}
					className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
						activeTab === "contacts"
							? "text-primary border border-primary bg-primary/10 rounded-xl"
							: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
					}`}
				>
					<UsersIcon size={16} />
					<span>Contactos CRM</span>
				</button>

				{/* Settings Panel */}
				<button
					type="button"
					onClick={() => setActiveTab("settings")}
					className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
						activeTab === "settings"
							? "text-primary border border-primary bg-primary/10 rounded-xl"
							: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
					}`}
				>
					<SettingsIcon size={16} />
					<span>Ajustes</span>
				</button>
			</div>

			<div className="mt-auto shrink-0" />
		</nav>
	);
}
