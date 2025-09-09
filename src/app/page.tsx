'use client';

import { useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export default function Page() {
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      // 1) (opsiyonel) Fotoğrafı Storage’a yükle
      let avatarUrl: string | null = null;
      const file = fileInput.current?.files?.[0] ?? null;

      if (file) {
        // Güvenli dosya adı + klasör yolu
        const safeName = file.name.replace(/[^\w.-]/g, '_');
        const path = `avatars/${Date.now()}_${safeName}`;
        const objectRef = storageRef(storage, path);

        // Küçük dosyalar için yeterli ve deterministik: uploadBytes
        await uploadBytes(objectRef, file, { contentType: file.type });
        avatarUrl = await getDownloadURL(objectRef);
      }

      // 2) Firestore’a kaydı yaz
      const docRef = await addDoc(collection(db, 'claims'), {
        handle: handle.trim(),
        note: note.trim() || null,
        avatarUrl,                 // yoksa null
        createdAt: serverTimestamp(),
      });

      setMsg(`✅ Kayıt eklendi: ${docRef.id}${avatarUrl ? ' (görsel yüklendi)' : ''}`);
      // İstersen formu sıfırlamak istersen:
      // setHandle('@kullanici');
      // setNote('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (err: any) {
      setMsg(`❌ Hata: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: '48px auto', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1>Sentient Mosaic — Minimal Test</h1>
      <p>Önce Firestore’a basit bir kayıt atalım; varsa fotoğrafı Storage’a yükleyelim.</p>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Twitter kullanıcı adı
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@kullanici"
          style={inputStyle}
        />

        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Profil fotoğrafı (opsiyonel)
        </label>
        <input ref={fileInput} type="file" accept="image/*" style={inputStyle} />

        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Not (isteğe bağlı)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          placeholder="Kısa bir not…"
          style={{ ...inputStyle, height: 120, resize: 'vertical' }}
        />

        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </form>

      {msg && (
        <p style={{ background: '#f6f9f9', padding: 12, marginTop: 16, whiteSpace: 'pre-wrap' }}>
          {msg}
        </p>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  display: 'block',
  padding: '12px',
  borderRadius: 8,
  border: '1px solid #d0d0d6',
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
