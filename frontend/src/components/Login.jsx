import { useEffect, useState } from 'react';
import axios from 'axios';

function Login() {
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    axios.get('/api/login-url')
      .then((response) => {
        setAuthUrl(response.data.auth_url);
      })
      .catch((error) => {
        console.error('Error fetching auth URL:', error);
      });
  }, []);

  return (
    <div>
      <p>Log in with Blizzard</p>
      {authUrl ? (
        <a href={authUrl}>Link Account</a>
      ) : (
        <p>Loading login URL...</p>
      )}
    </div>
  );
}

export default Login;
