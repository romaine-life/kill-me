// Root application component. Left sidebar tab navigation (matches bender-world /
// eight-queens pattern). Tabs:
//   - History (default): calendar/list view of past workouts with color-coded days
//   - Workout: detailed view of any day in the cycle (defaults to current day)
//   - Cycle: Synergy cycle overview — philosophy, day breakdown, recovery notes
//   - Soreness: daily muscle soreness journal with structured muscle picker
//   - Log (admin only): log a workout with quick or detailed mode
//   - Admin (localhost only + admin role): day override, database init and data migration
//
// Auth model: anyone can view (History/Today tabs load publicly). Only the
// admin user (whitelisted Microsoft email) sees the Log tab and the Admin tab.
/* global __BUILD_NUMBER__ */

import { useState, useEffect, useCallback } from 'react';
import { useWorkouts } from './hooks/useWorkouts';
import { useAuth } from './auth/AuthContext.jsx';
import { HistoryTab } from './components/HistoryTab';
import { DatabaseInit } from './components/DatabaseInit';
import { LogTab } from './components/WorkoutDrawer';
import { UserProfile } from './components/UserProfile';
import { TabBar } from './components/TabBar';
import { CycleTab } from './components/CycleTab';
import { SorenessTab } from './components/SorenessTab';
import { ExercisesTab } from './components/ExercisesTab';
import { ListTab } from './components/ListTab';
import { CycleDial } from './components/CycleDial';
import { isAdminMode } from './utils/adminMode';
import { getTotalDays } from './utils/dayConfig';
import { CalendarDays, RefreshCw, Activity, PenLine, Wrench, ListChecks, List, Menu } from 'lucide-react';

// Brand string tracks the cycle length so it can't drift from DAY_CONFIG.
const BRAND = `synergy-${getTotalDays()}`;

// Map URL path to tab id. Unknown paths fall back to 'list' (the landing page).
const tabFromPath = (path) => {
  const slug = path.replace(/^\//, '').toLowerCase();
  const valid = ['list', 'exercises', 'cycle', 'soreness', 'log', 'admin'];
  return valid.includes(slug) ? slug : 'list';
};

const pathFromTab = (tab) => (tab === 'list' ? '/' : `/${tab}`);

function App() {
  const [activeTab, setActiveTab] = useState(() => tabFromPath(window.location.pathname));
  const { isAdmin, loading } = useAuth();
  const { currentDay, setDay, setCurrentDay } = useWorkouts();
  const [logInitialDay, setLogInitialDay] = useState(null);
  const [logInitialDate, setLogInitialDate] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [logViewWorkout, setLogViewWorkout] = useState(null);
  const [logViewCardio, setLogViewCardio] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 760);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activityView, setActivityView] = useState('list'); // History tab: 'list' | 'calendar'

  // Push URL when tab changes (but not on initial mount)
  const navigateTab = useCallback((tab) => {
    setActiveTab(tab);
    const target = pathFromTab(tab);
    if (window.location.pathname !== target) {
      window.history.pushState(null, '', target);
    }
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPopState = () => setActiveTab(tabFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Admin tab requires both localhost dev mode AND admin role
  const showAdminTab = isAdminMode() && isAdmin;

  // Navigate to Log tab, optionally pre-filling day/date (e.g. from empty calendar click)
  const handleOpenLog = (dayNumber = null, date = null) => {
    setLogViewWorkout(null);
    setLogViewCardio(null);
    setLogInitialDay(dayNumber);
    setLogInitialDate(date);
    navigateTab('log');
  };

  // Navigate to Log tab showing an existing workout's details
  const handleViewWorkout = (workout) => {
    if (workout === null) {
      setLogViewWorkout(null);
      return;
    }
    setLogViewWorkout(workout);
    setLogViewCardio(null);
    setLogInitialDay(null);
    setLogInitialDate(null);
    navigateTab('log');
  };

  // Navigate to Log tab showing an existing cardio session
  const handleViewCardio = (session) => {
    if (session === null) {
      setLogViewCardio(null);
      return;
    }
    setLogViewCardio(session);
    setLogViewWorkout(null);
    setLogInitialDay(null);
    setLogInitialDate(null);
    navigateTab('log');
  };

  const handleWorkoutSuccess = (advancedTo) => {
    if (advancedTo) {
      setCurrentDay(advancedTo);
    }
    setRefreshKey(prev => prev + 1);
    setLogInitialDay(null);
    setLogInitialDate(null);
    setLogViewWorkout(null);
    setLogViewCardio(null);
    navigateTab('list');
  };

  const handleNav = (tab) => {
    navigateTab(tab);
    setMobileNavOpen(false);
  };

  const tabs = [
    { id: 'list', label: 'History', icon: CalendarDays },
    { id: 'exercises', label: 'Exercises', icon: ListChecks },
    { id: 'cycle', label: 'Cycle', icon: RefreshCw },
    { id: 'soreness', label: 'Soreness', icon: Activity },
    ...(isAdmin ? [{ id: 'log', label: 'Log', icon: PenLine }] : []),
    ...(showAdminTab ? [{ id: 'admin', label: 'Admin', icon: Wrench }] : [])
  ];

  if (loading) {
    return (
      <div style={{ ...styles.app, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--fg-muted)', fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <TopBar
        activeTab={activeTab}
        isMobile={isMobile}
        showAdminTab={showAdminTab}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
      />

      <div style={styles.main}>
        {!isMobile && (
          <AppSidebar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleNav}
            currentDay={currentDay}
            onDay={isAdmin ? setDay : undefined}
            isAdmin={isAdmin}
          />
        )}

        {isMobile && mobileNavOpen && (
          <div style={styles.mobileDrawer}>
            <AppSidebar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleNav}
              currentDay={currentDay}
              onDay={isAdmin ? setDay : undefined}
              isAdmin={isAdmin}
              compact
            />
          </div>
        )}

        {/* Tab content area */}
        <div
          className="app-tab-content"
          style={{
            ...styles.tabContent,
            // Clear the fixed bottom nav (+ home-indicator safe area) on mobile
            // so the last row of content is never hidden behind it.
            ...(isMobile ? { paddingBottom: 'calc(76px + env(safe-area-inset-bottom))' } : {}),
          }}
        >
          {activeTab === 'exercises' && (
            <ExercisesTab
              currentDay={currentDay}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'list' && (
            activityView === 'calendar' ? (
              <HistoryTab
                key={refreshKey}
                viewToggle={<ActivityToggle view={activityView} onChange={setActivityView} />}
                onDayClick={isAdmin ? handleOpenLog : undefined}
                onWorkoutClick={isAdmin ? handleViewWorkout : undefined}
                onCardioClick={isAdmin ? handleViewCardio : undefined}
              />
            ) : (
              <ListTab
                key={refreshKey}
                viewToggle={<ActivityToggle view={activityView} onChange={setActivityView} />}
                onWorkoutClick={isAdmin ? handleViewWorkout : undefined}
                onCardioClick={isAdmin ? handleViewCardio : undefined}
              />
            )
          )}

          {activeTab === 'cycle' && (
            <CycleTab currentDay={currentDay} />
          )}

          {activeTab === 'soreness' && (
            <SorenessTab isAdmin={isAdmin} />
          )}

          {activeTab === 'log' && isAdmin && (
            <LogTab
              initialDay={logInitialDay}
              initialDate={logInitialDate}
              currentDay={currentDay}
              onSuccess={handleWorkoutSuccess}
              viewWorkout={logViewWorkout}
              onViewWorkout={handleViewWorkout}
              onWorkoutChanged={() => {
                setLogViewWorkout(null);
                setRefreshKey(prev => prev + 1);
              }}
              viewCardio={logViewCardio}
              onViewCardio={handleViewCardio}
              onCardioChanged={() => {
                setLogViewCardio(null);
                setRefreshKey(prev => prev + 1);
              }}
            />
          )}

          {activeTab === 'admin' && showAdminTab && (
            <DatabaseInit currentDay={currentDay} onDayChange={setDay} />
          )}
        </div>
      </div>

      {isMobile && (
        <BottomNav tabs={tabs} activeTab={activeTab} onTabChange={handleNav} />
      )}

    </div>
  );
}

export default App;

function ActivityToggle({ view, onChange }) {
  const opts = [{ id: 'list', label: 'List' }, { id: 'calendar', label: 'Calendar' }];
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, width: 'fit-content' }}>
      {opts.map((o) => {
        const active = o.id === view;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              padding: '9px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-primary)', border: 'none', cursor: 'pointer',
              color: active ? 'var(--fg-primary)' : 'var(--fg-muted)',
              background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TopBar({ activeTab, isMobile, showAdminTab, mobileNavOpen, onToggleMobileNav }) {
  const title = activeTab === 'list' ? 'History' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  return (
    <header style={{ ...styles.topBar, ...(isMobile ? styles.topBarMobile : {}) }}>
      <div style={styles.topBarLeft}>
        {isMobile && (
          <button
            onClick={onToggleMobileNav}
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            style={styles.mobileMenuButton}
          >
            <Menu size={17} />
          </button>
        )}
        {isMobile && <BrandMark />}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
          <span className="display" style={styles.topTitle}>{isMobile ? BRAND : title}</span>
          {!isMobile && <span style={styles.topSubtitle}>activity feed · public view</span>}
        </div>
      </div>
      <div style={styles.topBarRight}>
        {showAdminTab && <span style={styles.adminPill}>admin</span>}
        <UserProfile />
      </div>
    </header>
  );
}

function AppSidebar({ tabs, activeTab, onTabChange, currentDay, onDay, isAdmin, compact = false }) {
  return (
    <aside style={{ ...styles.sidebar, ...(compact ? styles.sidebarCompact : {}) }}>
      <div style={styles.brand}>
        <BrandMark />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
          <span style={styles.brandName}>{BRAND}</span>
          <span style={styles.brandHost}>workout.romaine.life</span>
        </div>
      </div>

      <CycleDial currentDay={currentDay} onDay={onDay} />

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      <div style={{ flex: 1 }} />
    </aside>
  );
}

function BottomNav({ tabs, activeTab, onTabChange }) {
  // Log is the primary daily action for admins — surface it centered in the bar
  // (it's only in `tabs` when signed in as admin, so public visitors still see 4).
  const order = ['list', 'log', 'cycle', 'soreness'];
  const visibleTabs = order
    .map((id) => tabs.find((tab) => tab.id === id))
    .filter(Boolean);

  return (
    <nav style={{ ...styles.bottomNav, gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
      {visibleTabs.map((tab) => {
        const active = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{ ...styles.bottomNavButton, color: active ? 'var(--fg-primary)' : 'var(--fg-faint)' }}
          >
            {active && <span style={styles.bottomNavIndicator} />}
            <span style={{ display: 'flex', color: active ? 'var(--muscle-red)' : 'currentColor' }}>
              <Icon size={15} />
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function BrandMark() {
  return <div style={styles.brandMark}>{`S${getTotalDays()}`}</div>;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  app: {
    height: '100vh',
    background: 'var(--bg-app)',
    color: 'var(--fg-body)',
    fontFamily: 'var(--font-primary)',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 32px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-app)',
    flexShrink: 0,
    gap: 12,
    zIndex: 40,
  },
  topBarMobile: {
    padding: '12px 16px',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  topTitle: {
    fontSize: 20,
    color: 'var(--fg-primary)',
    letterSpacing: 0,
  },
  topSubtitle: {
    fontSize: 11,
    color: 'var(--fg-faint)',
    fontFamily: 'var(--font-mono)',
  },
  adminPill: {
    padding: '5px 9px',
    borderRadius: 9999,
    background: 'rgba(240,197,96,0.10)',
    color: 'var(--status-warn)',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
  },
  mobileMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-raised)',
    color: 'var(--fg-secondary)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'linear-gradient(135deg, #2a2a2a, #0d0d0d)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
    display: 'grid',
    placeItems: 'center',
    fontFamily: 'var(--font-primary)',
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: 0,
    color: 'var(--muscle-red)',
  },
  main: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    minHeight: 0,
    width: '100%',
    position: 'relative',
  },
  sidebar: {
    width: 260,
    flexShrink: 0,
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 12px 12px',
    gap: 14,
  },
  sidebarCompact: {
    width: '100%',
    minHeight: '100%',
    borderRight: 'none',
    padding: '12px 12px 16px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 6px',
  },
  brandName: {
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--fg-primary)',
    letterSpacing: 0,
  },
  brandHost: {
    fontSize: 10,
    color: 'var(--fg-faint)',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  mobileDrawer: {
    position: 'absolute',
    inset: '0 auto 0 0',
    width: 280,
    maxWidth: '86vw',
    zIndex: 30,
    background: 'var(--bg-sidebar)',
    boxShadow: '18px 0 36px rgba(0,0,0,0.45)',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    boxSizing: 'border-box',
    overflowY: 'auto',
    background: 'var(--bg-app)',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'grid',
    background: 'var(--bg-sidebar)',
    borderTop: '1px solid var(--border-subtle)',
    // Respect the home-indicator safe area on notched phones (needs
    // viewport-fit=cover in index.html) so the buttons aren't tucked under it.
    padding: '8px 8px calc(16px + env(safe-area-inset-bottom))',
    zIndex: 35,
  },
  bottomNavButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '6px 4px',
    fontSize: 10,
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    position: 'relative',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  bottomNavIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 2,
    background: 'var(--muscle-red)',
    borderRadius: 2,
  },
};
