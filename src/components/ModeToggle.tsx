"use client";

import { useState } from "react";

interface ModeToggleProps {
	conversationId: number;
	currentMode: "AI" | "HUMAN";
	onModeChange: (newMode: "AI" | "HUMAN") => void;
}

export default function ModeToggle({
	conversationId,
	currentMode,
	onModeChange,
}: ModeToggleProps) {
	const [loading, setLoading] = useState(false);

	const handleToggle = async (mode: "AI" | "HUMAN") => {
		if (loading || mode === currentMode) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/mode/${conversationId}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ mode }),
			});
			if (res.ok) {
				onModeChange(mode);
			} else {
				console.error("[toggle] Error cambiándole el modo al bot.");
			}
		} catch (error) {
			console.error("[toggle] Fallo de red cambiándole el modo:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex items-center gap-2 shrink-0">
			<button
				onClick={() => handleToggle("AI")}
				disabled={loading}
				className={`px-4 py-1.5 rounded-full font-display text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
					currentMode === "AI"
						? "bg-primary text-background"
						: "bg-transparent border border-outline-variant text-on-surface hover:bg-surface"
				} disabled:opacity-50`}
			>
				🤖 MODO IA
			</button>
			<button
				onClick={() => handleToggle("HUMAN")}
				disabled={loading}
				className={`px-4 py-1.5 rounded-full font-display text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
					currentMode === "HUMAN"
						? "bg-secondary text-background"
						: "bg-transparent border border-outline-variant text-on-surface hover:bg-surface"
				} disabled:opacity-50`}
			>
				👤 HUMANO
			</button>
		</div>
	);
}
