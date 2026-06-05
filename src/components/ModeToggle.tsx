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

	const nextMode = currentMode === "AI" ? "HUMAN" : "AI";

	const handleToggle = async () => {
		if (loading) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/mode/${conversationId}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ mode: nextMode }),
			});
			if (res.ok) {
				onModeChange(nextMode);
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
		<div className="flex shrink-0 items-center gap-2">
			<span className="font-display text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
				IA
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={currentMode === "HUMAN"}
				aria-label={
					currentMode === "HUMAN"
						? "Cambiar conversación a modo IA"
						: "Cambiar conversación a modo humano"
				}
				onClick={handleToggle}
				disabled={loading}
				className={`relative h-8 w-16 rounded-full border transition-all duration-200 disabled:opacity-50 ${
					currentMode === "HUMAN"
						? "border-secondary bg-secondary/20"
						: "border-primary bg-primary/20"
				}`}
			>
				<span
					className={`absolute top-1 size-6 rounded-full shadow-md transition-all duration-200 ${
						currentMode === "HUMAN"
							? "left-8 bg-secondary"
							: "left-1 bg-primary"
					}`}
				/>
			</button>
			<span className="font-display text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
				Humano
			</span>
		</div>
	);
}
