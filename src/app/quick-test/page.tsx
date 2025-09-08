'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export default function QuickTest() {
  const [twitter, setTwitter] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  async function uploadImage(f: File) {
    const stamp = Date.now();
    const safe = f.name.replace(/\s+/g, '-');
    const r = ref(storage, `avatars/${stamp}-${safe}`);
    await uploadBytes(r, f, { contentType: f.type });
    return getDownloadURL(r);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setMsg(null);

      let avatarUrl: string | null = null;
      if (file) avatarUrl = await uploadImage(file);

      const payload = {
        slot: 0, // tek piksel testi
        twitter: twitter.trim(),
        note: note.trim(),
        avatarUrl,                 // null olabilir; undefined gönderME
        createdAt: serverTimestamp()
      };

      const clean = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      );

      await addDoc(collection(db, 'claims'), clean);

      setMsg('✅ Firestore yazdı! (ve varsa görsel yüklendi)');
      setTwitter('');
      setNote('');
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setMsg('❌ Hata: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '48px auto', padding: 16 }}>
      <h1>Quick Test (slot=0)</h1>
      <p>Bu form tek piksel için basit bir testtir. Önce dosyasız deneyin, sonra küçük bir görselle deneyin.</p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <label>
          Twitter kullanıcı adı
          <input
            required
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="@kullanici"
            style={input}
          />
        </label>

        <label>
          Profil fotoğrafı (opsiyonel)
          <input type="file" accept="image/*" onChange={onFile} />
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

        <button type="submit" disabled={loading} style={btn}>
          {loading ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </form>

      {msg && (
        <pre style={{ background: '#f6f7f9', padding: 12, marginTop: 12, whiteSpace: 'pre-wrap' }}>
          {msg}
        </pre>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 8,
  outline: 'none',
  fontSize: 14,
  background: '#fff'
};

const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: 0,
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};
