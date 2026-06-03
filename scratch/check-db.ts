import "../scripts/env-loader.ts";
import pg from "pg";

async function checkDb() {
	const connectionString = process.env.DATABASE_URL?.replace("db:5432", "localhost:5432") || "postgresql://user:password@localhost:5432/whatsapp_bot";
	console.log("Connecting to:", connectionString);
	const pool = new pg.Pool({ connectionString });

	try {
		const convs = await pool.query("SELECT * FROM conversations");
		console.log("\n--- CONVERSATIONS ---");
		console.log(JSON.stringify(convs.rows, null, 2));

		const msgs = await pool.query("SELECT * FROM messages ORDER BY created_at DESC LIMIT 10");
		console.log("\n--- LATEST 10 MESSAGES ---");
		console.log(JSON.stringify(msgs.rows, null, 2));
		
		const events = await pool.query("SELECT * FROM conversation_events ORDER BY created_at DESC LIMIT 10");
		console.log("\n--- LATEST 10 EVENTS ---");
		console.log(JSON.stringify(events.rows, null, 2));

	} catch (error) {
		console.error("Error querying database:", error);
	} finally {
		await pool.end();
	}
}

checkDb();
