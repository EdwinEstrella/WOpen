import { NextResponse } from "next/server";
import { listConversations } from "../../../lib/db.ts";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const archived = searchParams.get("archived") === "true";
		const hasMessages = searchParams.get("hasMessages") === "true";
		const conversations = await listConversations({ archived, hasMessages });
		return NextResponse.json(conversations);
	} catch (error: any) {
		console.error("[api] Error en GET /api/conversations:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}
