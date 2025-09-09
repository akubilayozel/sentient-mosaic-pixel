'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Page() {
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      // 1) Varsa dosyayı Storage'a yükle
      let avatarUrl: string | null = null;

      if (file) {
        // basit benzersiz isim
        const ext = file.name.split('.').pop() || 'jpg';
        const key = `avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const storageRef = ref(storage, key);
        await uploadBytes(storageRef, file, { contentType: file.type });
        avatarUrl = await getDownloadURL(storageRef);
      }

      // 2) Firestore'a kaydı ekle
      const docRef = await addDoc(collection(db, 'claims'), {
        handle,
        note,
        avatarUrl,         // yoksa null
        createdAt: serverTimestamp(),
      });

      setMsg(`✅ Kayıt eklendi: ${docRef.id}`);
      setNote('');
      setFile(null);
    } catch (err: any) {
      setMsg(`❌ Hata: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '48px auto', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1>Sentient Mosaic — Minimal Test</h1>
      <p>Önce Firestore’a basit bir kayıt atalım; varsa fotoğrafı Storage’a yükleyelim.</p>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', margin: '12px 0 6px' }}>Twitter kullanıcı adı</label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@kullanici"
          style={input}
        />

        <label style={{ display: 'block', margin: '16px 0 6px' }}>Profil fotoğrafı (opsiyonel)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={input}
        />

        <label style={{ display: 'block', margin: '16px 0 6px' }}>Not (isteğe bağlı)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          placeholder="Kısa bir not…"
          style={{ ...input, height: 120, resize: 'vertical' }}
        />

        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </form>

      {msg && (
        <p style={{ background: '#f6f7f9', padding: 12, marginTop: 16, whiteSpace: 'pre-wrap' }}>
          {msg}
        </p>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  display: 'block',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d0d6e0',
  outline: 'none',
  fontSize: 14,
  background: '#fff',
};

const primaryBtn: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 14px',
  borderRadius: 8,
  border: 0,
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};
