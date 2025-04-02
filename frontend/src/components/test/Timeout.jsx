import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert } from 'react-bootstrap';

function Timeout() {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/timeout', {
        signal: AbortSignal.timeout(3000)
    })
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch((e) => {
        setError(e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>
  else if (error) return (
    <Alert variant='warning'>
        Could not retrieve character data. This character either does not exist or was transferred recently.
    </Alert>
  )

  return (
    <div>
        <p>{message}</p>
    </div>
  );
}

export default Timeout;
