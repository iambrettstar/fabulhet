import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSyncStore } from '../sync';
import { Modal } from './ManageModals';

const STATUS_LABEL: Record<string, string> = {
  synced: 'Synced to cloud',
  saving: 'Saving…',
  error: 'Sync error',
  conflict: 'Newer version in cloud',
  local: 'Local only',
};

export function AccountMenu() {
  const user = useSyncStore((s) => s.user);
  const status = useSyncStore((s) => s.status);
  const error = useSyncStore((s) => s.error);
  const signInWithEmail = useSyncStore((s) => s.signInWithEmail);
  const signOut = useSyncStore((s) => s.signOut);
  const pullLatest = useSyncStore((s) => s.pullLatest);

  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Cloud not configured — the app is local-only, show nothing.
  if (!supabase) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setFormError(null);
    const err = await signInWithEmail(email.trim());
    setSending(false);
    if (err) setFormError(err);
    else setSent(true);
  };

  if (!user) {
    return (
      <>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setSent(false);
            setFormError(null);
            setSignInOpen(true);
          }}
        >
          Sign in
        </button>
        <Modal open={signInOpen} onClose={() => setSignInOpen(false)} title="Sign in">
          {sent ? (
            <p className="auth-note">
              Check your inbox — we sent a sign-in link to <strong>{email}</strong>.
              You can close this window.
            </p>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              <p className="auth-note">
                Sign in to keep your novel backed up and available on any device.
                Your current work is preserved — first sign-in uploads it.
              </p>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <button className="btn btn-primary" type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Email me a sign-in link'}
              </button>
              {formError && <p className="auth-error">{formError}</p>}
            </form>
          )}
        </Modal>
      </>
    );
  }

  return (
    <div className="menu-wrap" ref={menuRef}>
      <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen((o) => !o)}>
        <span className={`sync-dot ${status}`} />
        Account ▾
      </button>
      {menuOpen && (
        <div className="menu-dropdown">
          <div className="menu-info">
            <div className="menu-info-email">{user.email}</div>
            <div className={`menu-info-status ${status}`}>
              {STATUS_LABEL[status] ?? status}
              {status === 'error' && error ? ` — ${error}` : ''}
            </div>
          </div>
          <button
            className="menu-item"
            onClick={() => {
              void pullLatest();
              setMenuOpen(false);
            }}
          >
            {status === 'conflict' ? 'Load latest from cloud' : 'Refresh from cloud'}
          </button>
          <button
            className="menu-item"
            onClick={() => {
              void signOut();
              setMenuOpen(false);
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
