import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Service type
interface Service {
    id: string;
    name: string;
    nameAr?: string;
    description?: string;
    price: number;
    duration: number; // minutes
    category?: string;
    active: boolean;
    createdAt?: string;
}

/**
 * GET /api/business/services?businessId=xxx
 * List all services for a business
 */
export async function GET(request: NextRequest) {
    const businessId = request.nextUrl.searchParams.get('businessId');

    if (!businessId) {
        return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    if (!isAdminConfigured) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    try {
        const businessDoc = await adminDb.collection('businesses').doc(businessId).get();

        if (!businessDoc.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const data = businessDoc.data()!;
        // Normalize services: onboarding stores { name, price, duration }
        // Knowledge page expects { id, name, price, duration, active, ... }
        const rawServices = data.services || [];
        const services: Service[] = rawServices.map((s: any, i: number) => ({
            id: s.id || `svc_legacy_${i}`,
            name: s.name || '',
            nameAr: s.nameAr || undefined,
            description: s.description || undefined,
            price: Number(s.price) || 0,
            duration: Number(s.duration) || 45,
            category: s.category || undefined,
            active: s.active !== false, // default to true if not set
        }));

        return NextResponse.json({ services });
    } catch (error) {
        console.error('[Services API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }
}

/**
 * POST /api/business/services
 * Add a new service
 * Body: { businessId, name, nameAr?, description?, price, duration, category? }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, name, nameAr, description, price, duration, category } = body;

        if (!businessId || !name || price === undefined || !duration) {
            return NextResponse.json(
                { error: 'businessId, name, price, and duration are required' },
                { status: 400 }
            );
        }

        if (!isAdminConfigured) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const newService: Service = {
            id: `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            nameAr: nameAr || undefined,
            description: description || undefined,
            price: Number(price),
            duration: Number(duration),
            category: category || 'General',
            active: true,
            createdAt: new Date().toISOString(),
        };

        const businessRef = adminDb.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();

        if (!businessDoc.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const existing = businessDoc.data()?.services || [];
        await businessRef.update({
            services: [...existing, newService],
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            service: newService,
            message: 'Service added successfully'
        });
    } catch (error) {
        console.error('[Services API] Error:', error);
        return NextResponse.json({ error: 'Failed to add service' }, { status: 500 });
    }
}

/**
 * PUT /api/business/services
 * Update a service
 * Body: { businessId, serviceId, updates: { name?, price?, duration?, etc } }
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, serviceId, updates } = body;

        if (!businessId || !serviceId || !updates) {
            return NextResponse.json(
                { error: 'businessId, serviceId, and updates are required' },
                { status: 400 }
            );
        }

        if (!isAdminConfigured) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const businessRef = adminDb.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();

        if (!businessDoc.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const data = businessDoc.data()!;
        const services: Service[] = data.services || [];

        const serviceIndex = services.findIndex(s => s.id === serviceId);
        if (serviceIndex === -1) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        services[serviceIndex] = { ...services[serviceIndex], ...updates };

        await businessRef.update({
            services,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            service: services[serviceIndex],
            message: 'Service updated successfully'
        });
    } catch (error) {
        console.error('[Services API] Error:', error);
        return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
    }
}

/**
 * DELETE /api/business/services
 * Delete a service
 * Body: { businessId, serviceId }
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, serviceId } = body;

        if (!businessId || !serviceId) {
            return NextResponse.json(
                { error: 'businessId and serviceId are required' },
                { status: 400 }
            );
        }

        if (!isAdminConfigured) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const businessRef = adminDb.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();

        if (!businessDoc.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const data = businessDoc.data()!;
        const services: Service[] = data.services || [];
        const filtered = services.filter(s => s.id !== serviceId);

        if (filtered.length === services.length) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        await businessRef.update({
            services: filtered,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('[Services API] Error:', error);
        return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
    }
}
