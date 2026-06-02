import { NextResponse } from "next/server";
import { deleteConversation } from "../../../../lib/db.ts";

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
