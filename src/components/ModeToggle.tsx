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
		<div className="flex items-center gap-1 bg-surface-container border border-outline-variant/20 p-1 rounded-xl shadow-inner shrink-0">
			<button
				onClick={() => handleToggle("AI")}
				disabled={loading}
				className={`px-3 py-1.5 rounded-lg font-display text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${
					currentMode === "AI"
						? "bg-primary text-on-primary shadow-md scale-105 glow-active"
						: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
				} disabled:opacity-50`}
			>
				🤖 MODO IA
			</button>
			<button
				onClick={() => handleToggle("HUMAN")}
				disabled={loading}
				className={`px-3 py-1.5 rounded-lg font-display text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${
					currentMode === "HUMAN"
						? "bg-secondary text-on-secondary shadow-md scale-105"
						: "text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/20"
				} disabled:opacity-50`}
			>
				👤 HUMANO
			</button>
		</div>
	);
}
