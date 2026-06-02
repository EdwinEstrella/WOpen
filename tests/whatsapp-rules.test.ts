import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decideOwnerKeywordAction,
  getTurnFinalizationCleanup,
  isFollowUpEligible,
  parseFollowUpDecision,
  parseNormalReply,
  planHandoffActions,
  shouldReactivateAfterOwnerReply,
  type FollowUpCandidate,
} from "../src/domain/whatsapp-rules.ts";

const settings = {
  botOffKeyword: "bot off",
  botOnKeyword: "ok.",
  keywordCaseSensitive: false,
  ownerReactivationDays: 3,
  followupMaxAttempts: 2,
  followupMinHoursAfterAssistant: 24,
  whatsappFreeformWindowHours: 24,
  blockOutside24hFollowups: true,
};

describe("owner keyword controls", () => {
  it("toggles only when the owner sends an exact normalized off/on keyword", () => {
    assert.equal(decideOwnerKeywordAction({ text: "  BOT OFF ", fromMe: true, settings }), "disable_bot");
    assert.equal(decideOwnerKeywordAction({ text: " ok. ", fromMe: true, settings }), "enable_bot");
    assert.equal(decideOwnerKeywordAction({ text: "bot off", fromMe: false, settings }), "none");
    assert.equal(decideOwnerKeywordAction({ text: "bot off please", fromMe: true, settings }), "none");
  });
});

describe("three day owner reactivation", () => {
  it("reactivates HUMAN chats only after the configured threshold", () => {
    const now = new Date("2026-06-04T12:00:00Z");
    assert.equal(shouldReactivateAfterOwnerReply({ mode: "HUMAN", fromMe: true, now, baseAt: new Date("2026-06-01T12:00:00Z"), settings }), true);
    assert.equal(shouldReactivateAfterOwnerReply({ mode: "HUMAN", fromMe: true, now, baseAt: new Date("2026-06-02T12:00:00Z"), settings }), false);
    assert.equal(shouldReactivateAfterOwnerReply({ mode: "AI", fromMe: true, now, baseAt: new Date("2026-06-01T12:00:00Z"), settings }), false);
  });
});

describe("turn finalization", () => {
  it("cleans transient Redis keys and excludes auth/durable state", () => {
    const cleanup = getTurnFinalizationCleanup("42");
    assert.deepEqual(cleanup.deleteKeys, [
      "wa:v1:turn:queue:42",
      "wa:v1:turn:debounce:42",
      "wa:v1:turn:processing:42",
    ]);
    assert.equal(cleanup.tokenSafeLockKey, "wa:v1:turn:lock:42");
    assert.equal(cleanup.touchesBaileysAuth, false);
    assert.equal(cleanup.touchesDurableDatabase, false);
  });
});

describe("follow-up eligibility", () => {
  const base: FollowUpCandidate = {
    mode: "AI",
    latestVisibleRole: "assistant",
    hasUserAfterLatestAssistant: false,
    followupAttempts: 0,
    lastAssistantAt: new Date("2026-06-01T12:00:00Z"),
    lastUserMessageAt: new Date("2026-06-02T12:00:00Z"),
    hasActiveTurnState: false,
    followupLockAcquired: true,
  };

  it("requires AI mode, assistant last, no user reply, attempts, no active processing, and 24h window", () => {
    const now = new Date("2026-06-03T12:00:00Z");
    assert.deepEqual(isFollowUpEligible(base, settings, now), { eligible: true });
    assert.equal(isFollowUpEligible({ ...base, mode: "HUMAN" }, settings, now).eligible, false);
    assert.equal(isFollowUpEligible({ ...base, latestVisibleRole: "user" }, settings, now).eligible, false);
    assert.equal(isFollowUpEligible({ ...base, hasUserAfterLatestAssistant: true }, settings, now).eligible, false);
    assert.equal(isFollowUpEligible({ ...base, followupAttempts: 2 }, settings, now).eligible, false);
    assert.equal(isFollowUpEligible({ ...base, hasActiveTurnState: true }, settings, now).eligible, false);
    assert.deepEqual(isFollowUpEligible({ ...base, lastUserMessageAt: new Date("2026-06-02T11:59:59Z") }, settings, now), { eligible: false, reason: "outside_24h_window" });
  });
});

describe("DeepSeek JSON validation", () => {
  it("accepts strict normal/follow-up JSON and refuses raw invalid text", () => {
    assert.deepEqual(parseNormalReply('{"response":{"part_1":"Hola","part_2":"","part_3":""},"handoff":{"required":false,"reason":""}}'), {
      ok: true,
      parts: ["Hola"],
      handoff: { required: false, reason: "" },
    });
    assert.deepEqual(parseNormalReply("Hola sin JSON"), { ok: false, sendRaw: false, reason: "invalid_json" });
    assert.deepEqual(parseFollowUpDecision('{"respuesta":"SI","mensaje":"¿Seguimos?"}'), { ok: true, shouldSend: true, message: "¿Seguimos?" });
    assert.deepEqual(parseFollowUpDecision("mensaje libre"), { ok: false, shouldSend: false, sendRaw: false, reason: "invalid_json" });
  });
});

describe("Humano handoff contract", () => {
  it("plans HUMAN mode and Telegram notification when handoff is required", () => {
    assert.deepEqual(planHandoffActions({ required: true, reason: "cliente pide asesor" }), {
      mode: "HUMAN",
      eventType: "handoff_to_human",
      notifyTelegram: true,
      reason: "cliente pide asesor",
    });
    assert.equal(planHandoffActions({ required: false, reason: "" }), null);
  });
});
