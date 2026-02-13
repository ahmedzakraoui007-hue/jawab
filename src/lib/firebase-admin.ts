// SERVER-ONLY: This file must never be imported from client components.
// It is only used in API routes (src/app/api/*).

import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK — for server-side Firestore access.
 * This bypasses Firestore security rules entirely, so it's safe
 * for webhook routes and other server-only API handlers.
 *
 * Required env vars:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 *
 * Get these from Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

const isConfigured = !!(projectId && clientEmail && privateKey);

if (!isConfigured) {
    console.warn(
        '[Firebase Admin] ⚠️ Missing credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.',
        { projectId: !!projectId, clientEmail: !!clientEmail, privateKey: !!privateKey }
    );
}

let adminDb: FirebaseFirestore.Firestore;

if (isConfigured) {
    const adminConfig: ServiceAccount = { projectId, clientEmail, privateKey };
    const adminApp =
        getApps().length === 0
            ? initializeApp({ credential: cert(adminConfig) })
            : getApps()[0];
    adminDb = getFirestore(adminApp);
} else {
    // Create a proxy that throws meaningful errors instead of crashing on import
    adminDb = new Proxy({} as FirebaseFirestore.Firestore, {
        get(_, prop) {
            throw new Error(
                `[Firebase Admin] Cannot use adminDb.${String(prop)} — credentials not configured.`
            );
        },
    });
}

export { adminDb, isConfigured as isAdminConfigured };
