import { useAuth } from '../auth/AuthContext.jsx';
import { colors } from '../colors';

export function UserProfile() {
  const { user, isAdmin, logout, signIn } = useAuth();

  if (!user) {
    return (
      <button
        onClick={signIn}
        style={styles.signInButton}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.bg.overlay; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = colors.bg.surface; }}
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

  return (
    <div style={styles.container}>
      <div style={styles.avatar}>
        {user.name?.charAt(0).toUpperCase()}
      </div>
      <span style={styles.name}>{user.name}</span>
      {!isAdmin && (
        <span style={styles.viewOnly}>View only</span>
      )}
      <button
        onClick={logout}
        style={styles.signOutButton}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.bg.overlay; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        Sign Out
      </button>
    </div>
  );
}

const styles = {
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
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    border: `2px solid rgba(34, 211, 238, 0.3)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: colors.accent.cyan,
  },
  name: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  viewOnly: {
    fontSize: 10,
    color: colors.accent.amber,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '2px 6px',
    borderRadius: 3,
    fontFamily: 'monospace',
  },
  signOutButton: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.text.tertiary,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border.subtle}`,
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
};
