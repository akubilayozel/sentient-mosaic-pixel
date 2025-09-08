import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * .env / Vercel Environment Variables:
 *  - NEXT_PUBLIC_FIREBASE_API_KEY
 *  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET          (örn: sentient-mosaic-XXXX.appspot.com)  <-- tırnaksız
 *  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *  - NEXT_PUBLIC_FIREBASE_APP_ID
 *  - (opsiyonel) NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID as string }
    : {}),
};

// Tek instance
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔧 Firestore'u undefined alanları YOK SAYACAK şekilde başlat.
// Böylece avatarUrl gibi opsiyonel alanlar undefined gelirse Firestore hata vermez.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

// --- Savunmalı Storage kurulumu (bucket formatı ne olursa olsun çalışır) ---
const rawBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
const bucketUrl = rawBucket
  ? rawBucket.startsWith('gs://')
    ? rawBucket
    : `gs://${rawBucket}`
  : undefined;

export const storage = bucketUrl ? getStorage(app, bucketUrl) : getStorage(app);
