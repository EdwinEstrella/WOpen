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
		<div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200">
			<button
				onClick={() => handleToggle("AI")}
				disabled={loading}
				className={`px-4 py-2 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-300 ${
					currentMode === "AI"
						? "bg-emerald-600 text-white shadow-md transform scale-105"
						: "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50"
				} disabled:opacity-50`}
			>
				🤖 Modo IA
			</button>
			<button
				onClick={() => handleToggle("HUMAN")}
				disabled={loading}
				className={`px-4 py-2 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all duration-300 ${
					currentMode === "HUMAN"
						? "bg-amber-500 text-white shadow-md transform scale-105"
						: "text-gray-500 hover:text-amber-500 hover:bg-amber-50/50"
				} disabled:opacity-50`}
			>
				👤 Humano
			</button>
		</div>
	);
}
