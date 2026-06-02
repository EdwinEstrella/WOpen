import {
	parseFollowUpDecision,
	parseNormalReply,
	type FollowUpDecisionParseResult,
	type MessageRole,
	type NormalReplyParseResult,
} from "../domain/whatsapp-rules.ts";

export type DeepSeekFetchResponse = {
	ok: boolean;
	status: number;
	json: () => Promise<unknown>;
};

export type DeepSeekFetch = (
	url: string | URL,
	init?: RequestInit,
) => Promise<DeepSeekFetchResponse>;

export interface DeepSeekClientConfig {
	apiKey: string;
	model: string;
	fetch: DeepSeekFetch;
	baseUrl?: string;
}

export interface DeepSeekHistoryMessage {
	role: MessageRole;
	content: string;
}

export interface NormalReplyRequest {
	systemPrompt: string;
	history: DeepSeekHistoryMessage[];
	queuedMessages: Array<{ text: string }>;
}

export interface FollowUpRequest {
	history: DeepSeekHistoryMessage[];
}

export type DeepSeekAdapterResult<T> =
	| { ok: true; parsed: T; rawContent: string; attempts: number }
	| {
			ok: false;
			reason: string;
			sendRaw: false;
			attempts: number;
			userMessage: string;
	  };

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Parser<T> = (raw: string) => T;

type ParseFailure = { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function chatUrl(config: DeepSeekClientConfig) {
	return `${(config.baseUrl ?? "https://api.deepseek.com/v1").replace(/\/$/, "")}/chat/completions`;
}

function safeFailure(
	reason: string,
	attempts: number,
): DeepSeekAdapterResult<never> {
	return {
		ok: false,
		reason,
		sendRaw: false,
		attempts,
		userMessage:
			"DeepSeek request failed safely; no raw model text is sendable.",
	};
}

function extractContent(payload: unknown): string | null {
	if (!isRecord(payload) || !Array.isArray(payload.choices)) return null;
	const first = payload.choices[0];
	if (!isRecord(first) || !isRecord(first.message)) return null;
	return typeof first.message.content === "string"
		? first.message.content
		: null;
}

function toChatHistory(history: DeepSeekHistoryMessage[]): ChatMessage[] {
	return history.map((item) => ({
		role: item.role === "assistant" ? "assistant" : "user",
		content: item.content,
	}));
}

function normalMessages(input: NormalReplyRequest): ChatMessage[] {
	return [
		{ role: "system", content: input.systemPrompt },
		...toChatHistory(input.history),
		{
			role: "user",
			content: [
				"Responde usando JSON estricto sin markdown.",
				'Formato obligatorio: {"response":{"part_1":"...","part_2":"...","part_3":"..."},"handoff":{"required":false,"reason":""}}.',
				"Usa handoff.required=true si necesita humano.",
				`Mensajes del turno: ${input.queuedMessages.map((m) => m.text).join("\n")}`,
			].join("\n"),
		},
	];
}

function followUpMessages(input: FollowUpRequest): ChatMessage[] {
	return [
		{
			role: "system",
			content:
				'Revisa si amerita seguimiento. Devuelve solo JSON estricto: {"respuesta":"SI"|"NO","mensaje":"..."}.',
		},
		...toChatHistory(input.history),
	];
}

function repairMessages(
	raw: string,
	kind: "normal" | "followup",
): ChatMessage[] {
	const schema =
		kind === "normal"
			? '{"response":{"part_1":"...","part_2":"...","part_3":"..."},"handoff":{"required":false,"reason":""}}'
			: '{"respuesta":"SI"|"NO","mensaje":"..."}';
	return [
		{
			role: "user",
			content: `Repara la salida anterior para que sea JSON estricto con este formato: ${schema}\nSalida anterior:\n${raw}`,
		},
	];
}

export function createDeepSeekClient(config: DeepSeekClientConfig) {
	async function post(messages: ChatMessage[]) {
		const response = await config.fetch(chatUrl(config), {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${config.apiKey}`,
			},
			body: JSON.stringify({
				model: config.model,
				messages,
				temperature: 0.3,
				response_format: { type: "json_object" },
			}),
		});
		if (!response.ok)
			return { ok: false as const, reason: `deepseek_http_${response.status}` };
		const content = extractContent(await response.json());
		if (content === null)
			return { ok: false as const, reason: "invalid_response_shape" };
		return { ok: true as const, content };
	}

	async function requestWithRepair<T extends { ok: boolean }>(input: {
		messages: ChatMessage[];
		kind: "normal" | "followup";
		parse: Parser<T>;
	}): Promise<DeepSeekAdapterResult<T>> {
		let attempts = 0;
		try {
			const first = await post(input.messages);
			attempts += 1;
			if (!first.ok) return safeFailure(first.reason, attempts);
			let parsed = input.parse(first.content);
			if (parsed.ok)
				return { ok: true, parsed, rawContent: first.content, attempts };

			const repair = await post(repairMessages(first.content, input.kind));
			attempts += 1;
			if (!repair.ok) return safeFailure(repair.reason, attempts);
			parsed = input.parse(repair.content);
			if (parsed.ok)
				return { ok: true, parsed, rawContent: repair.content, attempts };
			return safeFailure((parsed as unknown as ParseFailure).reason, attempts);
		} catch {
			return safeFailure("network_error", attempts + 1);
		}
	}

	return {
		generateNormalReply(input: NormalReplyRequest) {
			return requestWithRepair<NormalReplyParseResult>({
				messages: normalMessages(input),
				kind: "normal",
				parse: parseNormalReply,
			});
		},
		generateFollowUpDecision(input: FollowUpRequest) {
			return requestWithRepair<FollowUpDecisionParseResult>({
				messages: followUpMessages(input),
				kind: "followup",
				parse: parseFollowUpDecision,
			});
		},
	};
}
