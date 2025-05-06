import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

// Higher-order component for protected routes
function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Render the protected component if authenticated
  return children;
}

export default PrivateRoute;