import { NextResponse } from "next/server";
import {
	getMessages,
	getConversationById,
	insertMessageAndTouchConversation,
	enqueueOutbox,
	updateConversation,
} from "../../../../lib/db.ts";
import { withMediaAvailability } from "../../../../lib/media-metadata.ts";

interface Ctx {
	params: Promise<{ conversationId: string }>;
}

// Carga el historial de mensajes de la conversación
export async function GET(_req: Request, { params }: Ctx) {
	try {
		const { conversationId } = await params;
		const parsedId = Number.parseInt(conversationId, 10);
		
		if (Number.isNaN(parsedId)) {
			return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
		}

		const messages = withMediaAvailability(await getMessages(parsedId, 100));
		
		// Reset unread_count on read
		await updateConversation(parsedId, { unread_count: 0 }).catch((err) => {
			console.error("[api] Failed to reset unread_count:", err);
		});
		return NextResponse.json(messages);
	} catch (error: any) {
		console.error("[api] Error en GET /api/messages/[conversationId]:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}

// Envía un mensaje manual (Humano) desde el dashboard encolándolo en el outbox
export async function POST(req: Request, { params }: Ctx) {
	try {
		const { conversationId } = await params;
		const parsedId = Number.parseInt(conversationId, 10);
		
		if (Number.isNaN(parsedId)) {
			return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
		}

		const body = await req.json();
		const { content } = body;

		if (!content || typeof content !== "string" || !content.trim()) {
			return NextResponse.json({ error: "Content is required" }, { status: 400 });
		}

		const conversation = await getConversationById(parsedId);
		if (!conversation) {
			return NextResponse.json({ error: "Conversation not found" }, { status: 444 });
		}

		// 1. Persistimos el mensaje localmente como 'human' y 'outbound' para visualización inmediata
		const message = await insertMessageAndTouchConversation({
			conversation_id: parsedId,
			direction: "outbound",
			role: "human",
			content: content.trim(),
			media_type: "text",
			source: "dashboard",
			from_me: true,
		});

		// 2. Encolamos el mensaje en la tabla outbox para que el proceso del bot lo transmita
		await enqueueOutbox(parsedId, conversation.phone, content.trim());

		return NextResponse.json({ ok: true, messageId: message.id });
	} catch (error: any) {
		console.error("[api] Error en POST /api/messages/[conversationId]:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}
