import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

function Callback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get('code');
    const state = queryParams.get('state');

    if (code && state) {
      axios.get(`/api/account/callback?code=${code}&state=${state}`)
        .then(response => {
          // Store the token in localStorage or a secure cookie
          localStorage.setItem('token', response.data.access_token);
          navigate('/account');
        })
        .catch(error => {
          console.error('Error during callback:', error);
          navigate('/login');
        });
    }
  }, [location, navigate]);

  return <div>Processing login...</div>;
}

export default Callback;