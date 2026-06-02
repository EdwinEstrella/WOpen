import { NextResponse } from "next/server";
import { listConversations } from "../../../lib/db.ts";

export async function GET() {
	try {
		const conversations = await listConversations();
		return NextResponse.json(conversations);
	} catch (error: any) {
		console.error("[api] Error en GET /api/conversations:", error);
		return NextResponse.json(
			{ error: "Internal Server Error", message: error.message },
			{ status: 500 }
		);
	}
}
