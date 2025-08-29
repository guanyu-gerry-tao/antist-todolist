import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  // Check if the user is authenticated when the component mounts
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const apiUrl = import.meta.env.VITE_NODE_ENV === 'production' 
        ? import.meta.env.VITE_API_BASE_URL 
        : 'http://localhost:3001';
        
        const res = await fetch(`${apiUrl}/api/me`, {
          method: 'GET',
          credentials: 'include', // Include cookies for session management
        });
        if (!res.ok) {
          throw new Error('Unauthorized access, redirecting to login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/login');
      }
    }
    // Call the authentication check function
    checkAuthentication();
  }, []);

  return <>{children}</>; // Render children if authenticated
}