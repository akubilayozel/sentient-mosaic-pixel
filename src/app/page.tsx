'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import db, { storage } from '@/lib/firebase';

export default function Page() {
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const bucket = (storage as any)?.app?.options?.storageBucket ?? '(yok)';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!handle.trim()) {
      setMsg('Lütfen bir kullanıcı adı yaz.');
      return;
    }

    // (opsiyonel) dosya boyutu sınırı: 3MB
    if (file && file.size > 3 * 1024 * 1024) {
      setMsg('Dosya çok büyük (maks 3MB). Daha küçük bir görsel seç.');
      return;
    }

    setLoading(true);
    try {
      // 1) önce Firestore kaydı
      const base = {
        handle: handle.trim(),
        note: note.trim() || null,
        createdAt: serverTimestamp(),
      };
      const refDoc = await addDoc(collection(db, 'claims'), base);

      // 2) görsel varsa Storage’a tek seferde yükle (uploadBytes)
      if (file) {
        setMsg('📤 Yükleniyor...');
        const path = `avatars/${refDoc.id}-${file.name}`;
        const storageRef = ref(storage, path);

        // 60 sn kendi zaman aşımı
        const timeout = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error('Upload timeout')), ms));

        await Promise.race([
          uploadBytes(storageRef, file, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: 'public, max-age=31536000, immutable',
          }),
          timeout(60000),
        ]);

        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, 'claims', refDoc.id), { avatarUrl: url, storagePath: path });
        setMsg('✅ Kayıt + görsel yüklendi.');
      } else {
        setMsg('✅ Kayıt eklendi (görsel yok).');
      }

      setHandle('@kullanici');
      setNote('');
      setFile(null);
    } catch (err: any) {
      setMsg(`❌ Hata: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 680, margin: '40px auto', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1>Sentient Mosaic — Minimal Test</h1>
      <p>Önce Firestore’a basit bir kayıt atalım; varsa fotoğrafı Storage’a yükleyelim.</p>
      <p style={{ fontSize: 12, color: '#666' }}>Aktif bucket: <code>{bucket}</code></p>

      <form onSubmit={onSubmit}>
        <label>Twitter kullanıcı adı
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'block', margin: '16px 0 6px' }}>Profil fotoğrafı (opsiyonel)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'block', margin: '16px 0 6px' }}>Not (isteğe bağlı)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            style={{ ...inputStyle, height: 120, resize: 'vertical' }}
          />
        </label>

        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Gönderiliyor...' : 'Gönder'}
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
  border: '1px solid #d0d9de',
  outline: 'none',
  fontSize: 14,
  background: '#fff',
};

const primaryBtn: React.CSSProperties = {
  marginTop: 12,
  padding: '12px 14px',
  borderRadius: 8,
  border: 0,
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};
