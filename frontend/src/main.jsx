import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthContext.jsx'
import { WorkoutModelProvider } from './api/workoutModelContext.jsx'
import './index.css'
import App from './App.jsx'

// A stale document can request an asset removed by a newer deployment. The
// inline loader in index.html performs one cache-busting reload; reaching this
// module proves the current build loaded, so the guard can be cleared.
sessionStorage.removeItem('synergy-asset-reload');
const bootUrl = new URL(window.location.href);
if (bootUrl.searchParams.has('_asset_retry')) {
  bootUrl.searchParams.delete('_asset_retry');
  window.history.replaceState(null, '', `${bootUrl.pathname}${bootUrl.search}${bootUrl.hash}`);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <WorkoutModelProvider>
        <App />
      </WorkoutModelProvider>
    </AuthProvider>
  </StrictMode>,
)
