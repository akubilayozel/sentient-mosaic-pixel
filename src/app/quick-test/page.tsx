'use client';

import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export default function QuickTest() {
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      // 1) Önce avatarUrl olmadan yaz
      const base: any = {
        handle,
        note,
        slot: 165,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'claims'), base);

      // 2) Dosya varsa sonra yükle (opsiyonel)
      if (file && storage) {
        const fileRef = ref(storage, `avatars/${docRef.id}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        // İster ayrı koleksiyona logla, ister burada güncelleme yap
        await addDoc(collection(db, 'claims_changes'), {
          type: 'avatarUrlSet',
          claimId: docRef.id,
          avatarUrl: url,
          at: serverTimestamp(),
        });
      }

      setMsg(`OK ✅ id: ${docRef.id}`);
    } catch (err: any) {
      console.error(err);
      setMsg(`Hata ❌ ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h2>Quick Test</h2>

      <form onSubmit={onSubmit}>
        <label>
          Twitter kullanıcı adı
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            style={input}
            placeholder="@kullanici"
          />
        </label>

        <label>
          Profil fotoğrafı (opsiyonel)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <label>
          Not (280)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            style={{ ...input, height: 120, resize: 'vertical' }}
          />
        </label>

        <button type="submit" disabled={loading} style={primary}>
          {loading ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </form>

      {msg && (
        <pre style={{ background: '#f6f7f9', padding: 12, marginTop: 12 }}>{msg}</pre>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  display: 'block',
  padding: '10px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 8,
  outline: 'none',
  fontSize: 14,
  background: '#fff',
};

const primary: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: 0,
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};
