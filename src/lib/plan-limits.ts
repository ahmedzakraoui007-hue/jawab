import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { PLAN_CONVERSATION_LIMITS, PLAN_TIERS, type PlanTier } from '@/lib/pricing';

/**
 * Where a plan's conversation cap can come from, in priority order:
 *
 *   1. per-business override  — a custom/enterprise deal, one business only
 *   2. platform config doc    — changes the cap for everyone, no deploy
 *   3. code constant          — the numbers on the public pricing page
 *
 * The code constant stays the source of truth for what the marketing site
 * promises; the two override layers exist so that honouring a support
 * request ("bump this customer to 5,000 for the month") or reacting to
 * abuse doesn't require a code change, a build, and a redeploy.
 */
export type LimitSource = 'business' | 'platform' | 'default';

export interface ResolvedLimit {
    limit: number;
    source: LimitSource;
}

/** `null` means unlimited, both on the wire and in Firestore — `Infinity`
 * has no JSON representation, so it can't be stored or sent as-is. */
export type StoredLimit = number | null;

export type PlanLimitOverrides = Partial<Record<PlanTier, StoredLimit>>;

/** Firestore doc holding platform-wide operational settings. */
export const PLATFORM_CONFIG_PATH = { collection: 'config', doc: 'platform' } as const;

function fromStored(value: StoredLimit): number {
    return value === null ? Infinity : value;
}

/** A stored limit is only usable if it is null (unlimited) or a
 * non-negative finite number. Anything else — a string typed into the
 * admin UI, a negative number, NaN — is ignored in favour of the next
 * layer down, so a bad config value can never silently zero out every
 * business's quota. */
export function isValidStoredLimit(value: unknown): value is StoredLimit {
    if (value === null) return true;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Pure resolution of the three layers. Kept separate from any Firestore
 * access so the precedence rules are directly testable.
 */
export function resolvePlanLimit(
    plan: PlanTier,
    platformOverrides?: PlanLimitOverrides | null,
    businessOverride?: unknown
): ResolvedLimit {
    if (isValidStoredLimit(businessOverride)) {
        return { limit: fromStored(businessOverride), source: 'business' };
    }

    const platformValue = platformOverrides?.[plan];
    if (platformValue !== undefined && isValidStoredLimit(platformValue)) {
        return { limit: fromStored(platformValue), source: 'platform' };
    }

    return { limit: PLAN_CONVERSATION_LIMITS[plan], source: 'default' };
}

/** Drop anything that isn't a known plan tier with a valid limit, so a
 * malformed config doc degrades to "use the defaults" per-plan rather than
 * being trusted wholesale. */
export function sanitizeOverrides(raw: unknown): PlanLimitOverrides {
    const result: PlanLimitOverrides = {};
    if (!raw || typeof raw !== 'object') return result;

    for (const plan of PLAN_TIERS) {
        const value = (raw as Record<string, unknown>)[plan];
        if (value !== undefined && isValidStoredLimit(value)) {
            result[plan] = value;
        }
    }
    return result;
}

// The platform config doc is read on the hot path — once per inbound
// customer message, across every channel. Cache it in-process briefly so
// that's not an extra Firestore read per message, while still letting a
// change take effect within a minute without a deploy or restart.
const CACHE_TTL_MS = 60_000;
let cache: { value: PlanLimitOverrides; expiresAt: number } | null = null;

/** Test/admin hook: force the next read to hit Firestore. Called after a
 * write so the admin UI reflects the change immediately rather than up to
 * a minute later. */
export function invalidatePlanLimitCache(): void {
    cache = null;
}

export async function getPlatformOverrides(): Promise<PlanLimitOverrides> {
    if (cache && cache.expiresAt > Date.now()) {
        return cache.value;
    }
    if (!isAdminConfigured) return {};

    try {
        const snap = await adminDb
            .collection(PLATFORM_CONFIG_PATH.collection)
            .doc(PLATFORM_CONFIG_PATH.doc)
            .get();

        const value = sanitizeOverrides(snap.exists ? snap.data()?.planConversationLimits : undefined);
        cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
        return value;
    } catch (err) {
        // Same philosophy as usage.ts and rate-limit.ts: a config-read
        // outage falls back to the code defaults rather than failing the
        // customer's message. Not cached, so it retries on the next call.
        console.error('[plan-limits] Failed to read platform config, using code defaults:', err);
        return {};
    }
}

/**
 * The conversation cap actually in force for one business. `business` is
 * the already-fetched business doc data — every caller has it in hand, and
 * re-reading it here would double the Firestore reads per message.
 */
export async function getConversationLimit(
    plan: PlanTier,
    business?: { planOverrides?: { conversationLimit?: unknown } | null }
): Promise<ResolvedLimit> {
    const platformOverrides = await getPlatformOverrides();
    return resolvePlanLimit(plan, platformOverrides, business?.planOverrides?.conversationLimit);
}
