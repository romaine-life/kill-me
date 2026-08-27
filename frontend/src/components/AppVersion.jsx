import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { colors } from '../colors';
import {
  displayVersion,
  formatDeploymentTime,
  isUpdateAvailable,
} from '../utils/appVersion';

const POLL_INTERVAL_MS = 60_000;
const RELEASES_URL = 'https://github.com/romaine-life/kill-me/releases/tag/';

export function AppVersion() {
  const [release, setRelease] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/version', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      setRelease(await response.json());
    } catch {
      // Version status must never make the application unavailable. Keep the
      // last successful value and retry on the next poll/focus event.
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  if (!release) {
    return <div style={styles.loading}>Checking release…</div>;
  }

  const stale = isUpdateAvailable(release.buildId);
  const deployed = formatDeploymentTime(release.deployedAt);
  const isDevelopment = release.version?.includes('-dev');
  const versionLabel = displayVersion(release.version);

  return (
    <section style={{ ...styles.container, ...(stale ? styles.staleContainer : {}) }} aria-live="polite">
      {stale ? (
        <>
          <div style={styles.updateTitle}>v{release.version} is available</div>
          <button type="button" onClick={() => window.location.reload()} style={styles.reloadButton}>
            <RefreshCw size={12} />
            Reload app
          </button>
        </>
      ) : (
        <>
          {isDevelopment ? (
            <div style={styles.version}>{versionLabel}</div>
          ) : (
            <a
              href={`${RELEASES_URL}v${release.version}`}
              target="_blank"
              rel="noreferrer"
              style={styles.version}
              title={`View release notes for v${release.version}`}
            >
              {versionLabel}
            </a>
          )}
          {deployed && <div style={styles.deployed}>Deployed {deployed}</div>}
        </>
      )}
    </section>
  );
}

const styles = {
  container: {
    margin: '0 6px',
    padding: '10px 11px',
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 7,
    background: colors.bg.surface,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  staleContainer: {
    borderColor: colors.accent.red,
    gap: 8,
  },
  loading: {
    margin: '0 6px',
    padding: '8px 11px',
    color: colors.text.disabled,
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
  },
  version: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: 600,
    textDecoration: 'none',
  },
  deployed: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
  },
  updateTitle: {
    color: colors.text.primary,
    fontSize: 11,
    fontWeight: 700,
  },
  reloadButton: {
    border: 'none',
    borderRadius: 5,
    padding: '7px 9px',
    background: colors.accent.red,
    color: colors.text.primary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
