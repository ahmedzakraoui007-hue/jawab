import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    Timestamp
} from 'firebase/firestore';

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
    createdAt?: Date;
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

    if (!db) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    try {
        const businessRef = doc(db, 'businesses', businessId);
        const businessDoc = await getDoc(businessRef);

        if (!businessDoc.exists()) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const data = businessDoc.data();
        const faqs = data.customFaqs || [];

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

        if (!db) {
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
            createdAt: new Date(),
        };

        const businessRef = doc(db, 'businesses', businessId);
        await updateDoc(businessRef, {
            customFaqs: arrayUnion(newFaq),
            updatedAt: Timestamp.now(),
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

        if (!db) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const businessRef = doc(db, 'businesses', businessId);
        const businessDoc = await getDoc(businessRef);

        if (!businessDoc.exists()) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const data = businessDoc.data();
        const faqs: FAQ[] = data.customFaqs || [];

        const faqIndex = faqs.findIndex(f => f.id === faqId);
        if (faqIndex === -1) {
            return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }

        // Update the FAQ
        faqs[faqIndex] = { ...faqs[faqIndex], ...updates };

        await updateDoc(businessRef, {
            customFaqs: faqs,
            updatedAt: Timestamp.now(),
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

        if (!db) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const businessRef = doc(db, 'businesses', businessId);
        const businessDoc = await getDoc(businessRef);

        if (!businessDoc.exists()) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const data = businessDoc.data();
        const faqs: FAQ[] = data.customFaqs || [];

        const faqToRemove = faqs.find(f => f.id === faqId);
        if (!faqToRemove) {
            return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }

        await updateDoc(businessRef, {
            customFaqs: arrayRemove(faqToRemove),
            updatedAt: Timestamp.now(),
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
