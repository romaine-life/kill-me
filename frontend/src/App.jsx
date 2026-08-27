// Root application component. Left sidebar tab navigation (matches bender-world /
// eight-queens pattern). Tabs:
//   - Activity (default): overview, recovery, journal, list, and calendar views
//   - Exercises: exercise library organized by cycle day
//   - Cycle: Synergy cycle overview — philosophy, day breakdown, recovery notes
//   - Log (admin only): log a workout with quick or detailed mode
//   - Admin (localhost only + admin role): day override, database init and data migration
//
// Auth model: anyone can view Activity, Exercises, and Cycle. Only the
// admin user (whitelisted Microsoft email) sees the Log tab and the Admin tab.
import { useState, useEffect, useCallback } from 'react';
import { useWorkouts } from './hooks/useWorkouts';
import { useAuth } from './auth/AuthContext.jsx';
import { HistoryTab } from './components/HistoryTab';
import { DayOverride } from './components/DayOverride';
import { LogTab } from './components/WorkoutDrawer';
import { UserProfile } from './components/UserProfile';
import { TabBar } from './components/TabBar';
import { CycleTab } from './components/CycleTab';
import { SorenessTab } from './components/SorenessTab';
import { ExercisesTab } from './components/ExercisesTab';
import { ListTab } from './components/ListTab';
import { CycleDial } from './components/CycleDial';
import { ActivityRecordDetail } from './components/ActivityRecordDetail';
import { isAdminMode } from './utils/adminMode';
import { getTotalDays } from './utils/dayConfig';
import { RefreshCw, Activity, PenLine, Wrench, ListChecks, Menu } from 'lucide-react';

// Brand string tracks the cycle length, which now comes from the active workout
// model. It has to be read at render rather than at import: the model loads
// asynchronously, and at module-evaluation time there is no cycle yet.
const brand = () => `synergy-${getTotalDays()}`;

// Map URL path to tab id. The bare root and unknown paths land on Activity.
const tabFromPath = (path) => {
  const slug = path.replace(/^\//, '').toLowerCase();
  if (slug === 'list' || slug === 'history') return 'soreness';
  const valid = ['exercises', 'cycle', 'soreness', 'log', 'admin'];
  return valid.includes(slug) ? slug : 'soreness';
};

const pathFromTab = (tab) => (tab === 'soreness' ? '/' : `/${tab}`);

function App() {
  const [activeTab, setActiveTab] = useState(() => tabFromPath(window.location.pathname));
  const { isAdmin } = useAuth();
  const { currentDay, setDay, setCurrentDay } = useWorkouts();
  const [logInitialDay, setLogInitialDay] = useState(null);
  const [logInitialDate, setLogInitialDate] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [logViewWorkout, setLogViewWorkout] = useState(null);
  const [logViewCardio, setLogViewCardio] = useState(null);
  const [detailStack, setDetailStack] = useState([]);
  // Workout handed to the Soreness tab by a "Log soreness" action elsewhere,
  // so the editor opens already attributed to it. Cleared once consumed.
  const [sorenessSource, setSorenessSource] = useState(null);
  const [sorenessEditEntry, setSorenessEditEntry] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 760);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activityView, setActivityView] = useState('lanes');
  const [sorenessCreateRequested, setSorenessCreateRequested] = useState(false);
  // The editor temporarily replaces Activity content without changing the
  // selected view. Preserve enough context to return to its launch point.
  const [sorenessEditorOpen, setSorenessEditorOpen] = useState(false);
  const [sorenessReturnContext, setSorenessReturnContext] = useState(null);

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
    const onPopState = () => {
      setDetailStack([]);
      setSorenessEditorOpen(false);
      setSorenessReturnContext(null);
      setActiveTab(tabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // History is now a view within Activity, not a separate destination. Keep
  // old bookmarks working while normalizing them to the single Activity URL.
  useEffect(() => {
    if (/^\/(list|history)\/?$/i.test(window.location.pathname)) {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  // Admin tab requires both localhost dev mode AND admin role
  const showAdminTab = isAdminMode() && isAdmin;

  // Navigate to Log tab, optionally pre-filling day/date (e.g. from empty calendar click)
  const handleOpenLog = (dayNumber = null, date = null) => {
    setDetailStack([]);
    setLogViewWorkout(null);
    setLogViewCardio(null);
    setLogInitialDay(dayNumber);
    setLogInitialDate(date);
    navigateTab('log');
  };

  const handleOpenRecord = (kind, record) => {
    if (!record) return;
    setDetailStack((current) => [...current, { kind, record }]);
  };

  const handleCloseRecord = () => {
    setDetailStack((current) => current.slice(0, -1));
  };

  // Editors are explicit destinations reached from the shared record detail.
  const handleEditWorkout = (workout) => {
    if (workout === null) {
      setLogViewWorkout(null);
      return;
    }
    setDetailStack([]);
    setLogViewWorkout(workout);
    setLogViewCardio(null);
    setLogInitialDay(null);
    setLogInitialDate(null);
    navigateTab('log');
  };

  // Navigate to the Soreness tab with the editor pre-attributed to a workout
  const handleLogSoreness = (workout) => {
    setSorenessReturnContext({ tab: activeTab, detailStack });
    setDetailStack([]);
    setSorenessCreateRequested(false);
    setSorenessSource(workout);
    setSorenessEditEntry(null);
    setSorenessEditorOpen(true);
    navigateTab('soreness');
  };

  const handleEditCardio = (session) => {
    if (session === null) {
      setLogViewCardio(null);
      return;
    }
    setDetailStack([]);
    setLogViewCardio(session);
    setLogViewWorkout(null);
    setLogInitialDay(null);
    setLogInitialDate(null);
    navigateTab('log');
  };

  const handleEditSoreness = (entry) => {
    // The detail contains the pre-edit record, so return to its originating
    // Activity view rather than restoring a stale detail page after saving.
    setSorenessReturnContext({ tab: 'soreness', detailStack: [] });
    setDetailStack([]);
    setSorenessCreateRequested(false);
    setSorenessSource(null);
    setSorenessEditEntry(entry);
    setSorenessEditorOpen(true);
    navigateTab('soreness');
  };

  const handleCreateSoreness = () => {
    setSorenessReturnContext({ tab: 'soreness', detailStack: [] });
    setSorenessSource(null);
    setSorenessEditEntry(null);
    setSorenessCreateRequested(true);
    setSorenessEditorOpen(true);
  };

  const clearSorenessEditor = () => {
    setSorenessEditorOpen(false);
    setSorenessCreateRequested(false);
    setSorenessSource(null);
    setSorenessEditEntry(null);
  };

  const handleSorenessEditorClosed = () => {
    const returnContext = sorenessReturnContext;
    clearSorenessEditor();
    setSorenessReturnContext(null);
    setDetailStack(returnContext?.detailStack || []);
    if (returnContext?.tab && returnContext.tab !== activeTab) {
      navigateTab(returnContext.tab);
    }
  };

  const handleActivityViewChange = (view) => {
    // Selecting a view while editing is explicit navigation away from the
    // draft, so do not later restore the editor's launch point.
    clearSorenessEditor();
    setSorenessReturnContext(null);
    setActivityView(view);
  };

  const handleEditRecord = (kind, record) => {
    if (kind === 'workout') handleEditWorkout(record);
    if (kind === 'cardio') handleEditCardio(record);
    if (kind === 'soreness') handleEditSoreness(record);
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
    setDetailStack([]);
    setActivityView('list');
    navigateTab('soreness');
  };

  const handleNav = (tab) => {
    setDetailStack([]);
    clearSorenessEditor();
    setSorenessReturnContext(null);
    navigateTab(tab);
    setMobileNavOpen(false);
  };

  const tabs = [
    { id: 'soreness', label: 'Activity', icon: Activity },
    { id: 'exercises', label: 'Exercises', icon: ListChecks },
    { id: 'cycle', label: 'Cycle', icon: RefreshCw },
    ...(isAdmin ? [{ id: 'log', label: 'Log', icon: PenLine }] : []),
    ...(showAdminTab ? [{ id: 'admin', label: 'Admin', icon: Wrench }] : [])
  ];

  const activeDetail = detailStack[detailStack.length - 1] || null;

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
          {activeDetail ? (
            <ActivityRecordDetail
              kind={activeDetail.kind}
              record={activeDetail.record}
              isAdmin={isAdmin}
              onBack={handleCloseRecord}
              onEdit={handleEditRecord}
              onOpenRecord={handleOpenRecord}
              onAddSoreness={handleLogSoreness}
            />
          ) : (
            <>
          {activeTab === 'exercises' && (
            <ExercisesTab
              currentDay={currentDay}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'soreness' && (
            <ActivityWorkspace
              view={activityView}
              onViewChange={handleActivityViewChange}
              isAdmin={isAdmin}
              onCreateSoreness={handleCreateSoreness}
              editorOpen={sorenessEditorOpen}
            >
              {sorenessEditorOpen ? (
                <SorenessTab
                  key="soreness-editor"
                  isAdmin={isAdmin}
                  view={activityView}
                  initialCreate={sorenessCreateRequested}
                  onCreateConsumed={() => setSorenessCreateRequested(false)}
                  initialSource={sorenessSource}
                  onSourceConsumed={() => setSorenessSource(null)}
                  initialEditEntry={sorenessEditEntry}
                  onEditConsumed={() => setSorenessEditEntry(null)}
                  onEditorClosed={handleSorenessEditorClosed}
                  onOpenWorkout={(workout) => handleOpenRecord('workout', workout)}
                  onOpenCardio={(session) => handleOpenRecord('cardio', session)}
                  onOpenSoreness={(entry) => handleOpenRecord('soreness', entry)}
                />
              ) : activityView === 'calendar' ? (
                <HistoryTab
                  key={refreshKey}
                  onDayClick={isAdmin ? handleOpenLog : undefined}
                  onWorkoutClick={(workout) => handleOpenRecord('workout', workout)}
                  onCardioClick={(session) => handleOpenRecord('cardio', session)}
                  onSorenessClick={(entry) => handleOpenRecord('soreness', entry)}
                />
              ) : activityView === 'list' ? (
                <ListTab
                  key={refreshKey}
                  onWorkoutClick={(workout) => handleOpenRecord('workout', workout)}
                  onCardioClick={(session) => handleOpenRecord('cardio', session)}
                  onSorenessClick={(entry) => handleOpenRecord('soreness', entry)}
                />
              ) : (
                <SorenessTab
                  key="soreness-view"
                  isAdmin={isAdmin}
                  view={activityView}
                  onOpenWorkout={(workout) => handleOpenRecord('workout', workout)}
                  onOpenCardio={(session) => handleOpenRecord('cardio', session)}
                  onOpenSoreness={(entry) => handleOpenRecord('soreness', entry)}
                />
              )}
            </ActivityWorkspace>
          )}

          {activeTab === 'cycle' && (
            <CycleTab currentDay={currentDay} />
          )}

          {activeTab === 'log' && isAdmin && (
            <LogTab
              initialDay={logInitialDay}
              initialDate={logInitialDate}
              currentDay={currentDay}
              onSuccess={handleWorkoutSuccess}
              viewWorkout={logViewWorkout}
              onViewWorkout={handleEditWorkout}
              onLogSoreness={handleLogSoreness}
              onWorkoutChanged={() => {
                setLogViewWorkout(null);
                setRefreshKey(prev => prev + 1);
              }}
              viewCardio={logViewCardio}
              onViewCardio={handleEditCardio}
              onCardioChanged={() => {
                setLogViewCardio(null);
                setRefreshKey(prev => prev + 1);
              }}
            />
          )}

          {activeTab === 'admin' && showAdminTab && (
            <DayOverride currentDay={currentDay} onDayChange={setDay} />
          )}
            </>
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
  const opts = [
    { id: 'lanes', label: 'Overview' },
    { id: 'timeline', label: 'Recovery' },
    { id: 'journal', label: 'Journal' },
    { id: 'list', label: 'List' },
    { id: 'calendar', label: 'Calendar' },
  ];

  const handleKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % opts.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + opts.length) % opts.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = opts.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const next = opts[nextIndex];
    onChange(next.id);
    window.requestAnimationFrame(() => document.getElementById(`activity-tab-${next.id}`)?.focus());
  };

  return (
    <div
      className="activity-view-toggle"
      role="tablist"
      aria-label="Activity views"
      style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box' }}
    >
      {opts.map((o, index) => {
        const active = o.id === view;
        return (
          <button
            key={o.id}
            id={`activity-tab-${o.id}`}
            type="button"
            role="tab"
            onClick={() => onChange(o.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            aria-selected={active}
            aria-controls="activity-view-panel"
            tabIndex={active ? 0 : -1}
            style={{
              padding: '9px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-primary)', border: 'none', cursor: 'pointer',
              color: active ? 'var(--fg-primary)' : 'var(--fg-muted)',
              background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ActivityWorkspace({ view, onViewChange, isAdmin, onCreateSoreness, editorOpen, children }) {
  return (
    <div className="activity-workspace">
      <header className="activity-workspace-header">
        <div className="activity-workspace-heading">
          <h2>Activity &amp; Recovery</h2>
          <p>Strength, cardio, and recovery over time</p>
        </div>
        <div className="activity-workspace-controls">
          <ActivityToggle view={view} onChange={onViewChange} />
          {isAdmin && !editorOpen && (
            <button type="button" className="activity-add-soreness" onClick={onCreateSoreness}>
              <span className="activity-add-label-long">+ Add soreness</span>
              <span className="activity-add-label-short">+ Add</span>
            </button>
          )}
        </div>
      </header>
      <div
        id="activity-view-panel"
        className="activity-view-panel"
        role="tabpanel"
        aria-labelledby={`activity-tab-${view}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

function TopBar({ activeTab, isMobile, showAdminTab, mobileNavOpen, onToggleMobileNav }) {
  const title = activeTab === 'soreness'
      ? 'Activity'
      : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

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
          <span className="display" style={styles.topTitle}>{isMobile ? brand() : title}</span>
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

function AppSidebar({ tabs, activeTab, onTabChange, currentDay, onDay, compact = false }) {
  return (
    <aside style={{ ...styles.sidebar, ...(compact ? styles.sidebarCompact : {}) }}>
      <div style={styles.brand}>
        <BrandMark />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
          <span style={styles.brandName}>{brand()}</span>
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
  // Activity is home; Log stays prominent for admins, and the remaining public
  // destinations fill out the compact mobile navigation.
  const order = ['soreness', 'log', 'cycle', 'exercises'];
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
    width: '100vw',
    maxWidth: '100vw',
    boxSizing: 'border-box',
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
    maxWidth: '100%',
    minWidth: 0,
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
