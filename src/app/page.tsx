'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import db, { storage } from '@/lib/firebase';

export default function Page() {
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [progress, setProgress] = useState(0);

  const bucket = (storage as any)?.app?.options?.storageBucket ?? '(yok)';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setProgress(0);

    if (!handle.trim()) {
      setMsg('Lütfen bir kullanıcı adı yaz.');
      return;
    }
    if (file && file.size > 3 * 1024 * 1024) {
      setMsg('Dosya çok büyük (maks 3MB). Daha küçük bir görsel seç.');
      return;
    }

    setLoading(true);
    try {
      // 1) Firestore kaydı
      const docRef = await addDoc(collection(db, 'claims'), {
        handle: handle.trim(),
        note: note.trim() || null,
        createdAt: serverTimestamp(),
      });

      // 2) Görsel varsa Storage'a yükle (resumable + progress)
      if (file) {
        const path = `avatars/${docRef.id}-${file.name}`;
        const storageRef = ref(storage, path);

        setMsg('📤 Yükleme başladı…');
        const task = uploadBytesResumable(storageRef, file, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000, immutable',
        });

        await new Promise<string>((resolve, reject) => {
          task.on(
            'state_changed',
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setProgress(pct);
              if (pct < 100) setMsg(`📶 Yükleniyor… %${pct}`);
            },
            (err) => reject(err),
            async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              resolve(url);
            }
          );
        }).then(async (url) => {
          await updateDoc(doc(db, 'claims', docRef.id), { avatarUrl: url, storagePath: path });
          setMsg('✅ Kayıt + görsel yüklendi.');
        });
      } else {
        setMsg('✅ Kayıt eklendi (görsel yok).');
      }

      setHandle('@kullanici');
      setNote('');
      setFile(null);
      setProgress(0);
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
      <p style={{ fontSize: 12, color: '#666' }}>
        Aktif bucket: <code>{bucket}</code>
      </p>

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
          {loading ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </form>

      {progress > 0 && progress < 100 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 8, background: '#eee', borderRadius: 4 }}>
            <div style={{
              width: `${progress}%`,
              height: 8,
              background: '#111827',
              borderRadius: 4,
              transition: 'width .2s'
            }} />
          </div>
          <small>%{progress}</small>
        </div>
      )}

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
