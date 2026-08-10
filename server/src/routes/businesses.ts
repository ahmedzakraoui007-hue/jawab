import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

export const businessesRouter = Router();

const dayHoursSchema = z.object({ open: z.string(), close: z.string() }).nullable();

const createBusinessSchema = z.object({
    name: z.string().trim().min(1),
    industry: z.string().trim().default('other'),
    description: z.string().trim().default(''),
    address: z.string().trim().default(''),
    area: z.string().trim().default(''),
    city: z.string().trim().default(''),
    country: z.string().trim().default(''),
    googleMapsLink: z.string().trim().nullable().default(null),
    whatsappNumberRequested: z.string().trim().nullable().default(null),
    hours: z.record(z.string(), dayHoursSchema).default({}),
    services: z
        .array(z.object({ name: z.string(), price: z.number(), duration: z.number() }))
        .default([]),
});

businessesRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
    const existingUser = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!existingUser) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    if (existingUser.businessId) {
        res.status(409).json({ error: 'This account already has a business' });
        return;
    }

    const data = createBusinessSchema.parse(req.body);

    const business = await prisma.$transaction(async (tx) => {
        const created = await tx.business.create({
            data: {
                ownerId: req.userId!,
                name: data.name,
                industry: data.industry,
                description: data.description,
                address: data.address,
                area: data.area,
                city: data.city,
                country: data.country,
                googleMapsLink: data.googleMapsLink,
                whatsappNumberRequested: data.whatsappNumberRequested,
                hours: data.hours,
                services: data.services,
                staffIds: [req.userId!],
            },
        });

        await tx.user.update({
            where: { id: req.userId! },
            data: { businessId: created.id, onboardingComplete: true },
        });

        return created;
    });

    res.status(201).json({ business });
}));

businessesRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user?.businessId) {
        res.status(404).json({ error: 'No business associated with this account' });
        return;
    }

    const business = await prisma.business.findUnique({ where: { id: user.businessId } });
    if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
    }

    res.json({ business });
}));

const updateBusinessSchema = z.object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    address: z.string().trim().optional(),
    area: z.string().trim().optional(),
    city: z.string().trim().optional(),
    googleMapsLink: z.string().trim().nullable().optional(),
    tone: z.enum(['friendly', 'professional', 'casual']).optional(),
    hours: z.record(z.string(), dayHoursSchema).optional(),
}).strict();

async function requireOwnBusinessId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.businessId ?? null;
}

businessesRouter.patch('/me', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await requireOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const data = updateBusinessSchema.parse(req.body);
    const business = await prisma.business.update({ where: { id: businessId }, data });
    res.json({ business });
}));

// Whole-list replace, not per-item CRUD — the caller (dashboard) mutates
// its local copy of the list and PUTs the full array back. `id` is
// generated server-side for any item that doesn't already have one, so
// the client never has to invent identifiers itself.
const servicesSchema = z.array(z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1),
    nameAr: z.string().trim().optional(),
    description: z.string().trim().optional(),
    price: z.number().nonnegative(),
    duration: z.number().positive(),
    category: z.string().trim().optional(),
    active: z.boolean().default(true),
}));

businessesRouter.put('/me/services', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await requireOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const parsed = servicesSchema.parse(req.body.services);
    const services = parsed.map((s) => ({ ...s, id: s.id || randomUUID() }));
    const business = await prisma.business.update({ where: { id: businessId }, data: { services } });
    res.json({ services: business.services });
}));

const faqsSchema = z.array(z.object({
    id: z.string().optional(),
    question: z.string().trim().min(1),
    questionAr: z.string().trim().optional(),
    answer: z.string().trim().min(1),
    answerAr: z.string().trim().optional(),
    category: z.string().trim().optional(),
    active: z.boolean().default(true),
}));

businessesRouter.put('/me/faqs', requireAuth, asyncHandler(async (req, res) => {
    const businessId = await requireOwnBusinessId(req.userId!);
    if (!businessId) {
        res.status(403).json({ error: 'No business associated with this account' });
        return;
    }

    const parsed = faqsSchema.parse(req.body.faqs);
    const customFaqs = parsed.map((f) => ({ ...f, id: f.id || randomUUID() }));
    const business = await prisma.business.update({ where: { id: businessId }, data: { customFaqs } });
    res.json({ faqs: business.customFaqs });
}));
