// SERVER-ONLY: This file must never be imported from client components.
// It is only used in API routes (src/app/api/*).

import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK — for server-side Firestore access.
 * This bypasses Firestore security rules entirely, so it's safe
 * for webhook routes and other server-only API handlers.
 */

const adminConfig: ServiceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    // Private key comes with escaped newlines from env vars
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Singleton — only initialize once
const adminApp =
    getApps().length === 0
        ? initializeApp({ credential: cert(adminConfig) })
        : getApps()[0];

const adminDb = getFirestore(adminApp);

export { adminApp, adminDb };
