// Sidebar navigation styled to match the workout bundle: compact rounded rows
// with a red active rail and section label.

export function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <nav style={styles.nav}>
      <div className="eyebrow" style={styles.sectionLabel}>Surfaces</div>
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              ...styles.tab,
              color: active ? 'var(--fg-primary)' : 'var(--fg-muted)',
              background: active ? 'var(--bg-active)' : 'transparent',
              fontWeight: active ? 600 : 500,
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = 'transparent';
            }}
          >
            {active && <span style={styles.activeRail} />}
            {Icon && (
              <span style={{ color: active ? 'var(--muscle-red)' : 'currentColor', display: 'flex' }}>
                <Icon size={14} />
              </span>
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  sectionLabel: {
    padding: '8px 8px 4px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'var(--font-primary)',
    textAlign: 'left',
    transition: 'background var(--t-fast) var(--ease), color var(--t-fast) var(--ease)',
    position: 'relative',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  activeRail: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 2,
    background: 'var(--muscle-red)',
    borderRadius: 2,
  },
};
