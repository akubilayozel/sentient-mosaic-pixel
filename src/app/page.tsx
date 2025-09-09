'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Page() {
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      // Sadece Firestore yazıyoruz (dosya yok)
      const ref = await addDoc(collection(db, 'claims'), {
        handle: handle.trim(),
        note: note.trim(),
        createdAt: serverTimestamp(),
      });
      setMsg(`✅ Kayıt eklendi: ${ref.id}`);
      setNote('');
    } catch (err: any) {
      setMsg(`❌ Hata: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: '40px auto', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1>Sentient Mosaic — Minimal Test</h1>
      <p>Önce Firestore’a basit bir kayıt atalım (dosya yok).</p>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <label style={{ display: 'block', marginBottom: 10 }}>
          Twitter kullanıcı adı
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@kullanici"
            style={input}
            required
          />
        </label>

        <label style={{ display: 'block', marginBottom: 10 }}>
          Not (isteğe bağlı)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kısa bir not…"
            maxLength={280}
            style={{ ...input, height: 120, resize: 'vertical' }}
          />
        </label>

        <button type="submit" disabled={loading} style={btn}>
          {loading ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </form>

      {msg && (
        <pre style={{ background: '#f6f7f9', padding: 12, marginTop: 16, whiteSpace: 'pre-wrap' }}>
          {msg}
        </pre>
      )}
    </main>
  );
}

const input: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d0d5dd',
  borderRadius: 8,
  outline: 'none',
  fontSize: 14,
  marginTop: 6,
};

const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: 0,
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};
