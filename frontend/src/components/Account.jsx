import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Account() {
  const [accountInfo, setAccountInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setAccountInfo(JSON.parse(storedUser));
    }

    // Fetch fresh account info
    axios.get('/api/account')
      .then(response => {
        setAccountInfo(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      })
      .catch(error => {
        if (error.response?.status === 401) {
          localStorage.removeItem('user');
          navigate('/login');
        }
      });
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.get('/api/logout');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!accountInfo) return <div>Loading...</div>;

  return (
    <div>
      <h1>Account Information</h1>
      <p>Battle Tag: {accountInfo.battle_tag}</p>
      <p>Email: {accountInfo.email}</p>
      <Link to="/account/profile">View WoW Profile</Link>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Account;