import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';

/**
 * POST /api/admin/numbers
 * Assign a phone number to a business
 * 
 * Body:
 * - businessId: string (required)
 * - type: 'whatsapp' | 'phone' (required)
 * - number: string (required, E.164 format)
 * - sid?: string (Twilio SID, optional)
 */
export async function POST(request: NextRequest) {
    try {
        // TODO: Add admin authentication check
        // const session = await getSession();
        // if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { businessId, type, number, sid } = body;

        // Validate required fields
        if (!businessId || !type || !number) {
            return NextResponse.json(
                { error: 'businessId, type, and number are required' },
                { status: 400 }
            );
        }

        if (!['whatsapp', 'phone'].includes(type)) {
            return NextResponse.json(
                { error: 'type must be "whatsapp" or "phone"' },
                { status: 400 }
            );
        }

        // Validate E.164 format
        if (!number.match(/^\+[1-9]\d{1,14}$/)) {
            return NextResponse.json(
                { error: 'Number must be in E.164 format (e.g., +14155238886)' },
                { status: 400 }
            );
        }

        if (!db) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 503 }
            );
        }

        // Check if business exists
        const businessRef = doc(db, 'businesses', businessId);
        const businessDoc = await getDoc(businessRef);

        if (!businessDoc.exists()) {
            return NextResponse.json(
                { error: 'Business not found' },
                { status: 404 }
            );
        }

        // Build update object
        const fieldName = type === 'whatsapp' ? 'whatsappNumber' : 'phoneNumber';
        const assignment = {
            number,
            sid: sid || null,
            assignedAt: Timestamp.now(),
            assignedBy: 'admin', // TODO: Get actual admin user ID
        };

        // Update business document
        await updateDoc(businessRef, {
            [fieldName]: assignment,
            updatedAt: Timestamp.now(),
        });

        console.log(`[Admin] Assigned ${type} number ${number} to business ${businessId}`);

        return NextResponse.json({
            success: true,
            businessId,
            type,
            number,
            message: `${type === 'whatsapp' ? 'WhatsApp' : 'Phone'} number assigned successfully`,
        });

    } catch (error) {
        console.error('[Admin Numbers API Error]', error);
        return NextResponse.json(
            { error: 'Failed to assign number' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/numbers
 * Remove a phone number assignment from a business
 * 
 * Body:
 * - businessId: string
 * - type: 'whatsapp' | 'phone'
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, type } = body;

        if (!businessId || !type) {
            return NextResponse.json(
                { error: 'businessId and type are required' },
                { status: 400 }
            );
        }

        if (!db) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 503 }
            );
        }

        const fieldName = type === 'whatsapp' ? 'whatsappNumber' : 'phoneNumber';
        const businessRef = doc(db, 'businesses', businessId);

        await updateDoc(businessRef, {
            [fieldName]: null,
            updatedAt: Timestamp.now(),
        });

        console.log(`[Admin] Removed ${type} number from business ${businessId}`);

        return NextResponse.json({
            success: true,
            message: `${type === 'whatsapp' ? 'WhatsApp' : 'Phone'} number removed`,
        });

    } catch (error) {
        console.error('[Admin Numbers API Error]', error);
        return NextResponse.json(
            { error: 'Failed to remove number' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/numbers
 * Check number assignment status
 */
export async function GET() {
    return NextResponse.json({
        endpoints: {
            'POST /api/admin/numbers': 'Assign a number to a business',
            'DELETE /api/admin/numbers': 'Remove a number assignment',
        },
        example: {
            businessId: 'abc123',
            type: 'whatsapp',
            number: '+14155238886',
            sid: 'PN1234567890abcdef',
        },
    });
}
