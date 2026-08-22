import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthContext.jsx'
import { SnapshotProvider } from './api/snapshotContext.jsx'
import { WorkoutModelProvider } from './api/workoutModelContext.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SnapshotProvider>
        <WorkoutModelProvider>
          <App />
        </WorkoutModelProvider>
      </SnapshotProvider>
    </AuthProvider>
  </StrictMode>,
)
