import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

function OAuthCallback() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (!code || !state) {
        setError('Missing required parameters');
        return;
      }

      try {
        const response = await axios.get(`/api/callback?code=${code}&state=${state}`);
        if (response.data.success) {
          navigate('/account');
        } else {
          setError('Failed to process login');
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'An error occurred during login');
      }
    };

    handleCallback();
  }, [location, navigate]);

  if (error) {
    return (
      <div>
        <h1>Login Error</h1>
        <p>{error}</p>
        <button onClick={() => navigate('/login')}>Back to Login</button>
      </div>
    );
  }

  return <div>Processing login...</div>;
}

export default OAuthCallback;