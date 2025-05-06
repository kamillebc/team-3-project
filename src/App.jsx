import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import Login from './components/Login';
import Profile from './components/Profile';
import EventList from './components/EventList';
import LocalEvents from './components/LocalEvents'; // Import the LocalEvents component
import PrivateRoute from './PrivateRoute';
import './App.css';

function App() {
  const [user, loading] = useAuthState(auth);
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <Routes>
        {/* Login/Landing page route */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/profile" replace /> : <Login />} 
        />
        
        {/* Profile route */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        
        {/* API Events route */}
        <Route
          path="/events"
          element={
            <PrivateRoute>
              <EventList />
            </PrivateRoute>
          }
        />
        
        {/* LocalEvents route - New addition */}
        <Route
          path="/local-events"
          element={
            <PrivateRoute>
              <LocalEvents />
            </PrivateRoute>
          }
        />

        {/* Catch-all redirect for any other routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;