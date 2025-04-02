import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function SimulationResult() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const runSimulation = async () => {
      if (!location.state?.simcInput) {
        navigate('/');
        return;
      }

      try {
        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ simc_input: location.state.simcInput }),
        });

        if (!response.ok) throw new Error('Simulation failed');
        
        const htmlContent = await response.text();
        setResult(htmlContent);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    runSimulation();
  }, [location.state, navigate]);

  const handleDownload = () => {
    if (!result) return;

    const blob = new Blob([result], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulation-result.html';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Running simulation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/')}
        >
          Back to Simulation
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-3">
      <div className="row mb-3">
        <div className="col">
          <button 
            className="btn btn-secondary me-2"
            onClick={() => navigate('/')}
          >
            New Simulation
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleDownload}
          >
            Download Results
          </button>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <iframe
            srcDoc={result}
            style={{
              width: '100%',
              height: 'calc(100vh - 100px)',
              border: '1px solid #dee2e6',
              borderRadius: '0.25rem'
            }}
            title="Simulation Results"
          />
        </div>
      </div>
    </div>
  );
}

export default SimulationResult;