import { NextResponse } from "next/server";
import { deleteConversation, getConversationById, updateConversation } from "../../../../lib/db.ts";

interface Ctx {
	params: Promise<{ conversationId: string }>;
}

export async function DELETE(_req: Request, { params }: Ctx) {
	try {
		const { conversationId } = await params;
		const parsedId = Number.parseInt(conversationId, 10);
		
		if (Number.isNaN(parsedId)) {
			return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
		}

		await deleteConversation(parsedId);
		return NextResponse.json({ ok: true, message: "Conversation deleted successfully." });
	} catch (error: any) {
		console.error("[api] Error en DELETE /api/conversations/[conversationId]:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}

export async function PATCH(req: Request, { params }: Ctx) {
	try {
		const { conversationId } = await params;
		const parsedId = Number.parseInt(conversationId, 10);

		if (Number.isNaN(parsedId)) {
			return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
		}

		const body = await req.json().catch(() => ({}));
		const rawName = typeof body.name === "string" ? body.name.trim() : "";
		const name = rawName.length > 0 ? rawName.slice(0, 120) : null;

		const existing = await getConversationById(parsedId);
		if (!existing) {
			return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
		}

		const updated = await updateConversation(parsedId, { name });
		return NextResponse.json(updated);
	} catch (error: any) {
		console.error("[api] Error en PATCH /api/conversations/[conversationId]:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}
