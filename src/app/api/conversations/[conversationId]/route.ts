import { NextResponse } from "next/server";
import { deleteConversation, getConversationById, updateConversation } from "../../../../lib/db.ts";
import { normalizeLeadLabels } from "../../../../domain/whatsapp-rules.ts";
import { authErrorToResponse, requireRequestRole } from "@/lib/auth/session";
import { runtimeSessionDeps as authDeps } from "@/lib/auth/runtime";

interface Ctx {
	params: Promise<{ conversationId: string }>;
}

export async function DELETE(_req: Request, { params }: Ctx) {
	try {
		await requireRequestRole(_req, authDeps, "agent");
		const { conversationId } = await params;
		const parsedId = Number.parseInt(conversationId, 10);
		
		if (Number.isNaN(parsedId)) {
			return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
		}

		await deleteConversation(parsedId);
		return NextResponse.json({ ok: true, message: "Conversation deleted successfully." });
	} catch (error: any) {
		const authResponse = authErrorToResponse(error);
		if (authResponse) return authResponse;
		console.error("[api] Error en DELETE /api/conversations/[conversationId]:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}

export async function PATCH(req: Request, { params }: Ctx) {
	try {
		await requireRequestRole(req, authDeps, "agent");
		const { conversationId } = await params;
		const parsedId = Number.parseInt(conversationId, 10);

		if (Number.isNaN(parsedId)) {
			return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
		}

		const body = await req.json().catch(() => ({}));
		const patch: any = {};
		
		if (typeof body.name === "string") {
			const rawName = body.name.trim();
			patch.name = rawName.length > 0 ? rawName.slice(0, 120) : null;
		}
		if (typeof body.is_archived === "boolean") {
			patch.is_archived = body.is_archived;
		}
		if (Array.isArray(body.lead_labels)) {
			patch.lead_labels = normalizeLeadLabels(body.lead_labels);
			patch.lead_updated_by = "dashboard";
			patch.lead_updated_at = new Date();
		}
		if (
			body.lead_score === null ||
			(typeof body.lead_score === "number" &&
				Number.isFinite(body.lead_score) &&
				body.lead_score >= 0 &&
				body.lead_score <= 100)
		) {
			patch.lead_score =
				body.lead_score === null ? null : Math.round(body.lead_score);
			patch.lead_updated_by = "dashboard";
			patch.lead_updated_at = new Date();
		}
		if (typeof body.lead_score_reason === "string") {
			patch.lead_score_reason =
				body.lead_score_reason.trim().slice(0, 240) || null;
			patch.lead_updated_by = "dashboard";
			patch.lead_updated_at = new Date();
		}

		const existing = await getConversationById(parsedId);
		if (!existing) {
			return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
		}

		const updated = await updateConversation(parsedId, patch);
		return NextResponse.json(updated);
	} catch (error: any) {
		const authResponse = authErrorToResponse(error);
		if (authResponse) return authResponse;
		console.error("[api] Error en PATCH /api/conversations/[conversationId]:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}
