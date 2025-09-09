// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * .env / Vercel Environment Variables
 * (tırnak YOK)
 * NEXT_PUBLIC_FIREBASE_API_KEY=...
 * NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
 * NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sentient-mosaic-a8297.appspot.com
 * NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
 * NEXT_PUBLIC_FIREBASE_APP_ID=...
 * (opsiyonel) NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }
    : {}),
} as const;

// Tek instance
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firestore (kayıt)
export const db = getFirestore(app);

// Storage (upload) — bucket URL'ünü gerekirse normalize et
const rawBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const bucketUrl =
  rawBucket && !rawBucket.startsWith('gs://')
    ? `gs://${rawBucket}`
    : rawBucket || undefined;

// storageBucket config’de tanımlıysa `getStorage(app)` yeterli.
// İstersen bucketUrl ile daha açık çağırıyoruz; yoksa fallback.
export const storage = bucketUrl ? getStorage(app, bucketUrl) : getStorage(app);

// (opsiyonel) app'ı da lazım olursa export edebilirsin:
// export { app };
