import { useState, useEffect, useCallback } from 'react';
import SimulationReport from './SimulationReport';

function AsyncSimulationDisplay({ jobId, onClose, onComplete }) {
  const [status, setStatus] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/simulate/status/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to get status');
      }
      const data = await response.json();
      setStatus(data.status);
      setQueuePosition(data.queue_position);
      setEstimatedWait(data.estimated_wait);

      if (data.status === 'COMPLETED') {
        // Fetch result
        const resultResponse = await fetch(`/api/simulate/result/${jobId}`);
        if (!resultResponse.ok) {
          throw new Error('Failed to get result');
        }
        const resultContent = await resultResponse.text();
        setResult(resultContent);
        onComplete(resultContent);
      } else if (data.status === 'FAILED') {
        setError(data.error || 'Simulation failed');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [jobId, onComplete]);

  useEffect(() => {
    let intervalId;
    
    if (status !== 'COMPLETED' && status !== 'FAILED' && !error) {
      // Start checking status immediately
      checkStatus();
      
      // Then check every 5 seconds
      intervalId = setInterval(checkStatus, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status, error, checkStatus]);

  const formatWaitTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  if (error) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title">Simulation Error</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p className="text-danger">{error}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'COMPLETED' && result) {
    return (
      <SimulationReport 
        htmlContent={result}
        onClose={onClose}
        jobId={jobId}
      />
    );
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Simulation in Progress</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center">
            <div className="mb-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h6>Status: {status}</h6>
            {queuePosition > 0 && (
              <p>Queue Position: {queuePosition}</p>
            )}
            {estimatedWait && (
              <p>Estimated Wait: {formatWaitTime(estimatedWait)}</p>
            )}
            <small className="text-muted">
              Job ID: {jobId}
            </small>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AsyncSimulationDisplay;