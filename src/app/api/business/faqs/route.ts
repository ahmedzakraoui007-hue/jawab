import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// FAQ type
interface FAQ {
    id: string;
    question: string;
    questionAr?: string;
    answer: string;
    answerAr?: string;
    category?: string;
    keywords?: string[];
    active: boolean;
    createdAt?: string;
}

/**
 * GET /api/business/faqs?businessId=xxx
 * List all FAQs for a business
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
        const rawFaqs = data.customFaqs || [];
        // Normalize FAQs: add missing id/active fields
        const faqs: FAQ[] = rawFaqs.map((f: any, i: number) => ({
            id: f.id || `faq_legacy_${i}`,
            question: f.question || '',
            questionAr: f.questionAr || undefined,
            answer: f.answer || '',
            answerAr: f.answerAr || undefined,
            category: f.category || undefined,
            keywords: f.keywords || [],
            active: f.active !== false,
        }));

        return NextResponse.json({ faqs });
    } catch (error) {
        console.error('[FAQs API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch FAQs' }, { status: 500 });
    }
}

/**
 * POST /api/business/faqs
 * Add a new FAQ
 * Body: { businessId, question, questionAr?, answer, answerAr?, category?, keywords? }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, question, questionAr, answer, answerAr, category, keywords } = body;

        if (!businessId || !question || !answer) {
            return NextResponse.json(
                { error: 'businessId, question, and answer are required' },
                { status: 400 }
            );
        }

        if (!isAdminConfigured) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const newFaq: FAQ = {
            id: `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            question,
            questionAr: questionAr || undefined,
            answer,
            answerAr: answerAr || undefined,
            category: category || 'General',
            keywords: keywords || [],
            active: true,
            createdAt: new Date().toISOString(),
        };

        const businessRef = adminDb.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();

        if (!businessDoc.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const existing = businessDoc.data()?.customFaqs || [];
        await businessRef.update({
            customFaqs: [...existing, newFaq],
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            faq: newFaq,
            message: 'FAQ added successfully'
        });
    } catch (error) {
        console.error('[FAQs API] Error:', error);
        return NextResponse.json({ error: 'Failed to add FAQ' }, { status: 500 });
    }
}

/**
 * PUT /api/business/faqs
 * Update a FAQ
 * Body: { businessId, faqId, updates: { question?, answer?, etc } }
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, faqId, updates } = body;

        if (!businessId || !faqId || !updates) {
            return NextResponse.json(
                { error: 'businessId, faqId, and updates are required' },
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
        const faqs: FAQ[] = data.customFaqs || [];

        const faqIndex = faqs.findIndex(f => f.id === faqId);
        if (faqIndex === -1) {
            return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }

        faqs[faqIndex] = { ...faqs[faqIndex], ...updates };

        await businessRef.update({
            customFaqs: faqs,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            faq: faqs[faqIndex],
            message: 'FAQ updated successfully'
        });
    } catch (error) {
        console.error('[FAQs API] Error:', error);
        return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 });
    }
}

/**
 * DELETE /api/business/faqs
 * Delete a FAQ
 * Body: { businessId, faqId }
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, faqId } = body;

        if (!businessId || !faqId) {
            return NextResponse.json(
                { error: 'businessId and faqId are required' },
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
        const faqs: FAQ[] = data.customFaqs || [];
        const filtered = faqs.filter(f => f.id !== faqId);

        if (filtered.length === faqs.length) {
            return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }

        await businessRef.update({
            customFaqs: filtered,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: 'FAQ deleted successfully'
        });
    } catch (error) {
        console.error('[FAQs API] Error:', error);
        return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 });
    }
}
