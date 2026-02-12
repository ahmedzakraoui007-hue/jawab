import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Resolve Firebase auth domain for Vercel deployments.
// Priority: explicit env var → VERCEL_URL → client window host → default.
// IMPORTANT: You must also add your Vercel domain to:
//   1. Firebase Console → Authentication → Settings → Authorized Domains
//   2. Google Cloud Console → OAuth → Authorized redirect URIs
//      (add https://<your-app>.vercel.app/__/auth/handler)
function resolveAuthDomain(): string {
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) {
        return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    }
    if (process.env.VERCEL_URL) {
        return process.env.VERCEL_URL;
    }
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return window.location.host;
    }
    return 'demo-project.firebaseapp.com';
}

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
    authDomain: resolveAuthDomain(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

// Initialize Firebase (singleton pattern)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let initialized = false;

function initializeFirebase() {
    if (initialized) {
        return { app, auth, db, storage };
    }

    try {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }

        // Always initialize Firestore (works on both client and server)
        db = getFirestore(app);

        // Auth and Storage only work properly on client side
        if (typeof window !== 'undefined') {
            auth = getAuth(app);
            storage = getStorage(app);

            // Connect to emulators in development if configured
            if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
                connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
                connectFirestoreEmulator(db, 'localhost', 8080);
            }
        }

        initialized = true;
        console.log('[Firebase] Initialized successfully', typeof window !== 'undefined' ? '(client)' : '(server)');
    } catch (error) {
        console.warn('[Firebase] Initialization failed:', error);
    }

    return { app, auth, db, storage };
}

// Lazy initialization on first access
export function getFirebaseAuth(): Auth | undefined {
    if (!auth && typeof window !== 'undefined') {
        initializeFirebase();
    }
    return auth;
}

export function getFirebaseDb(): Firestore | undefined {
    if (!db) {
        initializeFirebase();
    }
    return db;
}

export function getFirebaseStorage(): FirebaseStorage | undefined {
    if (!storage && typeof window !== 'undefined') {
        initializeFirebase();
    }
    return storage;
}

// Auto-initialize on import
initializeFirebase();

// Export for convenience
export { app, auth, db, storage };

