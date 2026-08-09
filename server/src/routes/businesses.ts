import { Router } from 'express';
import { z } from 'zod';
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
