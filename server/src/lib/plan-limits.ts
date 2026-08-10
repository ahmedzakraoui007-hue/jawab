import { prisma } from '../db';
import { PLAN_CONVERSATION_LIMITS, PLAN_TIERS, type PlanTier } from './pricing';

export type LimitSource = 'business' | 'platform' | 'default';

export interface ResolvedLimit {
    limit: number;
    source: LimitSource;
}

/** `null` means unlimited, both on the wire and in the database —
 * `Infinity` has no JSON/Postgres-numeric representation. */
export type StoredLimit = number | null;
export type PlanLimitOverrides = Partial<Record<PlanTier, StoredLimit>>;

const PLATFORM_CONFIG_ID = 'platform';

function fromStored(value: StoredLimit): number {
    return value === null ? Infinity : value;
}

export function isValidStoredLimit(value: unknown): value is StoredLimit {
    if (value === null) return true;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

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

const CACHE_TTL_MS = 60_000;
let cache: { value: PlanLimitOverrides; expiresAt: number } | null = null;

export function invalidatePlanLimitCache(): void {
    cache = null;
}

export async function getPlatformOverrides(): Promise<PlanLimitOverrides> {
    if (cache && cache.expiresAt > Date.now()) {
        return cache.value;
    }

    try {
        const config = await prisma.platformConfig.findUnique({ where: { id: PLATFORM_CONFIG_ID } });
        const value = sanitizeOverrides(config?.planConversationLimits);
        cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
        return value;
    } catch (err) {
        console.error('[plan-limits] Failed to read platform config, using code defaults:', err);
        return {};
    }
}

export async function setPlatformOverrides(overrides: PlanLimitOverrides): Promise<void> {
    await prisma.platformConfig.upsert({
        where: { id: PLATFORM_CONFIG_ID },
        create: { id: PLATFORM_CONFIG_ID, planConversationLimits: overrides },
        update: { planConversationLimits: overrides },
    });
    invalidatePlanLimitCache();
}

export async function getConversationLimit(
    plan: PlanTier,
    businessOverride?: unknown
): Promise<ResolvedLimit> {
    const platformOverrides = await getPlatformOverrides();
    return resolvePlanLimit(plan, platformOverrides, businessOverride);
}
