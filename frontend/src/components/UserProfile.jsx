import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { startLogin } from '../auth/index.js';
import { colors } from '../colors';

// Gravatar for the signed-in email. Uses SHA-256 (Gravatar's modern hash);
// crypto.subtle needs a secure context, which both localhost and https satisfy.
// `d=retro` gives a deterministic pixel-art fallback when the email has no
// gravatar. If hashing or the image itself fails, we fall back to the initial.
async function gravatarUrl(email, size = 64) {
  const norm = (email || '').trim().toLowerCase();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `https://www.gravatar.com/avatar/${hex}?d=retro&s=${size}`;
}

export function UserProfile() {
  const { user, loading, isAdmin, logout } = useAuth();
  const [avatarSrc, setAvatarSrc] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Derive the gravatar URL whenever the email changes.
  useEffect(() => {
    let cancelled = false;
    setImgFailed(false);
    if (!user?.email) { setAvatarSrc(null); return; }
    gravatarUrl(user.email)
      .then((url) => { if (!cancelled) setAvatarSrc(url); })
      .catch(() => { if (!cancelled) setAvatarSrc(null); });
    return () => { cancelled = true; };
  }, [user?.email]);

  // Dismiss the popup on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading) {
    return <span style={styles.checking}>Checking sign-in…</span>;
  }

  if (!user) {
    return (
      <button
        onClick={startLogin}
        style={styles.signInButton}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.bg.overlay; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.bg.surface; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21">
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
        Sign in
      </button>
    );
  }

  const initial = user.name?.charAt(0).toUpperCase() || '?';

  return (
    <div style={styles.container} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.name}`}
        title={user.name}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.bg.overlay; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {avatarSrc && !imgFailed ? (
          <img
            src={avatarSrc}
            alt=""
            width={28}
            height={28}
            style={styles.avatarImg}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span style={styles.avatarFallback}>{initial}</span>
        )}
        <ChevronDown
          size={14}
          color={colors.text.tertiary}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {open && (
        <div style={styles.popup} role="menu">
          <div style={styles.popupName}>{user.name}</div>
          <div style={styles.popupEmail}>{user.email}</div>
          {!isAdmin && <div style={styles.viewOnly}>View only</div>}
          <div style={styles.divider} />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); logout(); }}
            style={styles.signOutButton}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.bg.overlay; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  checking: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  signInButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 12px',
    borderRadius: 4,
    border: `1px solid ${colors.border.strong}`,
    backgroundColor: colors.bg.surface,
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'monospace',
    cursor: 'pointer',
  },
  container: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: 3,
    borderRadius: 999,
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'block',
    objectFit: 'cover',
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: colors.bg.overlay,
    border: `1px solid ${colors.border.strong}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  popup: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: 200,
    maxWidth: 260,
    backgroundColor: colors.bg.overlay,
    border: `1px solid ${colors.border.strong}`,
    borderRadius: 8,
    padding: 12,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontFamily: 'monospace',
  },
  popupName: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: 700,
  },
  popupEmail: {
    color: colors.text.tertiary,
    fontSize: 11,
    wordBreak: 'break-all',
  },
  viewOnly: {
    alignSelf: 'flex-start',
    fontSize: 10,
    color: colors.accent.amber,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '2px 6px',
    borderRadius: 3,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    margin: '4px 0',
  },
  signOutButton: {
    width: '100%',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.text.secondary,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border.strong}`,
    padding: '8px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
};
