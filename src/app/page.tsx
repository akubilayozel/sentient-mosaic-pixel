'use client';

import React, { useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// 👉 DİKKAT: named import (default import yok)
import { db, storage } from '@/lib/firebase';

export default function Page() {
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '—';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    setMsg('');
    setProgress(0);

    try {
      // 1) Firestore’a temel kaydı at
      const payload = {
        handle: handle.trim(),
        note: note.trim() || null,
        createdAt: serverTimestamp(),
        avatarUrl: null as string | null,
        avatarPath: null as string | null,
      };

      const col = collection(db, 'claims');
      const docRef = await addDoc(col, payload);

      // 2) Fotoğraf varsa Storage’a yükle ve kaydı güncelle
      if (file) {
        const safeName = file.name.replace(/\s+/g, '-');
        const path = `avatars/${docRef.id}/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, path);

        const task = uploadBytesResumable(storageRef, file, {
          cacheControl: 'public, max-age=31536000',
        });

        await new Promise<void>((resolve, reject) => {
          task.on(
            'state_changed',
            (snap) => {
              const pct = Math.round(
                (snap.bytesTransferred / snap.totalBytes) * 100
              );
              setProgress(pct);
            },
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              await updateDoc(doc(db, 'claims', docRef.id), {
                avatarUrl: url,
                avatarPath: path,
              });
              resolve();
            }
          );
        });
      }

      setMsg(`✅ Kayıt eklendi: ${docRef.id}`);
    } catch (e: any) {
      setErr(`❌ Hata: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  // Basit stiller
  const wrap: React.CSSProperties = {
    maxWidth: 720,
    margin: '56px auto',
    padding: '0 16px',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  };
  const input: React.CSSProperties = {
    width: '100%',
    display: 'block',
    padding: '12px',
    borderRadius: 8,
    border: '1px solid #d0d7de',
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
  const progressBarWrap: React.CSSProperties = {
    height: 8,
    width: '100%',
    background: '#eef2ff',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
  };
  const progressBar: React.CSSProperties = {
    height: '100%',
    width: `${progress}%`,
    background: '#6366f1',
    transition: 'width .2s ease',
  };

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Sentient Mosaic — Minimal Test
      </h1>

      <p style={{ color: '#6b7280', marginBottom: 8 }}>
        Önce Firestore’a basit bir kayıt atalım; varsa fotoğrafı Storage’a
        yükleyelim.
      </p>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 18 }}>
        <small>
          Aktif bucket: <code>{bucket}</code>
        </small>
      </p>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Twitter kullanıcı adı
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@kullanici"
          style={input}
          disabled={loading}
        />

        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Profil fotoğrafı (opsiyonel)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={input}
          disabled={loading}
        />

        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Not (isteğe bağlı)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          style={{ ...input, height: 130, resize: 'vertical' }}
          disabled={loading}
        />

        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </form>

      {/* İlerleme */}
      {loading && file && (
        <div style={{ marginTop: 12 }}>
          <small style={{ color: '#6b7280' }}>⬆ Upload ilerliyor…</small>
          <div style={progressBarWrap}>
            <div style={progressBar} />
          </div>
          <small style={{ color: '#6b7280' }}>{progress}%</small>
        </div>
      )}

      {/* Mesajlar */}
      {msg && (
        <p
          style={{
            marginTop: 16,
            background: '#ecfdf5',
            color: '#065f46',
            padding: '10px 12px',
            borderRadius: 8,
          }}
        >
          {msg}
        </p>
      )}
      {err && (
        <p
          style={{
            marginTop: 16,
            background: '#fef2f2',
            color: '#7f1d1d',
            padding: '10px 12px',
            borderRadius: 8,
          }}
        >
          {err}
        </p>
      )}
    </main>
  );
}
