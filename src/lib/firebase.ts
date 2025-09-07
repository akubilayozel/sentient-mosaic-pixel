import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  // measurementId opsiyonel olabilir
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID as string }
    : {}),
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Storage “bucket URL” savunmalı kurulum (gs:// veya düz ad destekli)
const rawBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
const bucketUrl = rawBucket
  ? rawBucket.startsWith('gs://')
    ? rawBucket
    : `gs://${rawBucket}`
  : undefined;

export const storage = bucketUrl ? getStorage(app, bucketUrl) : getStorage(app);
