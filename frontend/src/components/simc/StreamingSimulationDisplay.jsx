import { useEffect, useState, useRef } from 'react';
import { Modal, Button, ProgressBar, Alert } from 'react-bootstrap';

const StreamingSimulationDisplay = ({ simulationInput, onClose, onComplete }) => {
  const [output, setOutput] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('connecting');
  const [resultUrl, setResultUrl] = useState(null);
  const [connectionLogs, setConnectionLogs] = useState([]);
  const socketRef = useRef(null);
  const outputContainerRef = useRef(null);
  
  const addLog = (message, type = 'info') => {
    console.log(`[WebSocket ${type}]:`, message);
    const timestamp = new Date().toISOString();
    setConnectionLogs(logs => [...logs, { timestamp, message, type }]);
  };

  useEffect(() => {
    // Log websocket creation
    addLog('Creating WebSocket connection...', 'init');
    
    // Determine the correct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = "localhost:8000";
    const url = `${protocol}//${host}/api/simulate/stream`;
    
    addLog(`Connecting to: ${url}`, 'init');
    
    // Create WebSocket connection
    const socket = new WebSocket(url);
    socketRef.current = socket;
    
    // Log socket properties
    addLog(`Socket created with readyState: ${socket.readyState}`, 'init');
    addLog(`Socket binary type: ${socket.binaryType}`, 'init');
    addLog(`Socket protocol: ${socket.protocol || 'none'}`, 'init');
    addLog(`Socket extensions: ${socket.extensions || 'none'}`, 'init');
    
    socket.onopen = (event) => {
      addLog('WebSocket connection opened', 'success');
      addLog(`readyState: ${socket.readyState}`, 'success');
      setStatus('connected');
      
      // Send the simulation input once connected
      try {
        const payload = JSON.stringify({ simc_input: btoa(simulationInput) });
        addLog(`Sending payload (length: ${payload.length})`, 'info');
        socket.send(payload);
        addLog('Payload sent successfully', 'success');
      } catch (err) {
        addLog(`Error sending payload: ${err.message}`, 'error');
        setError(`Failed to send simulation input: ${err.message}`);
      }
    };
    
    socket.onmessage = (event) => {
      try {
        addLog(`Received message (size: ${event.data.length})`, 'data');
        const data = JSON.parse(event.data);
        
        if (data.type === 'error') {
          addLog(`Error from server: ${data.content}`, 'error');
          setError(data.content);
          setStatus('error');
        } else if (data.type === 'complete') {
          addLog(`Simulation complete. Result URL: ${data.content}`, 'success');
          setStatus('complete');
          setResultUrl(data.content);
          fetchResult(data.content);
        } else {
          // Log progress updates less frequently to reduce noise
          if (data.progress && data.progress % 10 < 1) {
            addLog(`Progress update: ${Math.round(data.progress)}%`, 'progress');
          }
          
          // Append output
          setOutput(prev => [...prev, data]);
          
          // Update progress if available
          if (data.progress) {
            setProgress(data.progress);
          }
          
          // Auto-scroll to bottom
          if (outputContainerRef.current) {
            outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
          }
        }
      } catch (err) {
        addLog(`Error parsing message: ${err.message}`, 'error');
        addLog(`Raw message: ${event.data.substring(0, 200)}...`, 'error');
        setError(`Failed to parse server message: ${err.message}`);
      }
    };
    
    socket.onerror = (event) => {
      addLog('WebSocket error occurred', 'error');
      addLog(`readyState: ${socket.readyState}`, 'error');
      console.error('WebSocket error:', event);
      setError('Connection error. Check console for details.');
      setStatus('error');
    };
    
    socket.onclose = (event) => {
      addLog(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`, 'info');
      addLog(`Was clean? ${event.wasClean ? 'Yes' : 'No'}`, 'info');
      addLog(`Final readyState: ${socket.readyState}`, 'info');
      
      if (status !== 'complete' && status !== 'error') {
        setError(`Connection closed unexpectedly (code: ${event.code}, reason: ${event.reason || 'Not provided'})`);
        setStatus('error');
      }
    };
    
    // Cleanup function
    return () => {
      addLog('Component unmounting, closing WebSocket', 'cleanup');
      if (socket) {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          addLog(`Closing socket (current state: ${socket.readyState})`, 'cleanup');
          socket.close(1000, 'Component unmounted');
        } else {
          addLog(`Socket already closed/closing (state: ${socket.readyState})`, 'cleanup');
        }
      }
    };
  }, [simulationInput]);
  
  const fetchResult = async (resultPath) => {
    addLog(`Fetching result from: ${resultPath}`, 'info');
    try {
      const response = await fetch(`/${resultPath}`);
      if (!response.ok) {
        addLog(`Failed to fetch result: ${response.status} ${response.statusText}`, 'error');
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      addLog(`Result fetched successfully (size: ${htmlContent.length})`, 'success');
      onComplete(htmlContent);
    } catch (error) {
      addLog(`Error fetching result: ${error.message}`, 'error');
      console.error('Error fetching simulation result:', error);
      setError(`Failed to load simulation result: ${error.message}`);
      setStatus('error');
    }
  };
  
  const handleRetryConnection = () => {
    addLog('Manually retrying connection', 'info');
    // Close existing socket if open
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close(1000, 'Manual reconnect');
    }
    
    setStatus('connecting');
    setError(null);
    setOutput([]);
    setProgress(0);
    
    // Create new socket with same input
    // This will re-trigger the useEffect
    setConnectionLogs([]);
    setTimeout(() => {
      // Force re-render by setting state again
      setStatus('reconnecting');
    }, 100);
  };
  
  const formatOutput = (data) => {
    if (data.type === 'stdout') {
      return <div key={`line-${output.indexOf(data)}`} className="text-light">{data.content}</div>;
    } else if (data.type === 'stderr') {
      return <div key={`line-${output.indexOf(data)}`} className="text-danger">{data.content}</div>;
    }
    return null;
  };
  
  const handleCancel = () => {
    addLog('User cancelled simulation', 'info');
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      socketRef.current.close(1000, 'User cancelled');
    }
    onClose();
  };

  // Show connection debugging interface when there's an error
  const showDebugInfo = status === 'error';

  return (
    <Modal show={true} onHide={handleCancel} backdrop="static" size="lg">
      <Modal.Header closeButton>
        <Modal.Title>SimC Simulation {status === 'error' ? '- Error' : status === 'complete' ? '- Complete' : '- Running'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger">
            <strong>Error:</strong> {error}
            <Button variant="outline-danger" size="sm" className="float-end" onClick={handleRetryConnection}>
              Retry Connection
            </Button>
          </Alert>
        )}
        
        <div className="d-flex flex-column mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-bold">Status: {status.charAt(0).toUpperCase() + status.slice(1)}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar 
            now={progress} 
            variant={status === 'error' ? 'danger' : status === 'complete' ? 'success' : 'primary'} 
          />
        </div>
        
        <div 
          ref={outputContainerRef}
          className="bg-dark p-3 rounded" 
          style={{ 
            height: showDebugInfo ? '200px' : '400px', 
            overflow: 'auto', 
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {output.map(formatOutput)}
        </div>
        
        {showDebugInfo && (
          <div className="mt-3">
            <h5>Connection Debug Info</h5>
            <div className="bg-light p-2 rounded" style={{ maxHeight: '200px', overflow: 'auto' }}>
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Timestamp</th>
                    <th style={{ width: '100px' }}>Type</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {connectionLogs.map((log, idx) => (
                    <tr key={idx} className={log.type === 'error' ? 'table-danger' : log.type === 'success' ? 'table-success' : ''}>
                      <td className="text-muted small">{log.timestamp}</td>
                      <td><span className={`badge bg-${log.type === 'error' ? 'danger' : log.type === 'success' ? 'success' : 'info'}`}>{log.type}</span></td>
                      <td>{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-3">
              <h6>Current WebSocket State</h6>
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  ReadyState: 
                  <span className="badge bg-secondary">
                    {socketRef.current ? 
                      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][socketRef.current.readyState] || socketRef.current.readyState : 
                      'No Socket'}
                  </span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Protocol: <span>{socketRef.current?.protocol || 'none'}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Binary Type: <span>{socketRef.current?.binaryType || 'N/A'}</span>
                </li>
              </ul>
            </div>
            
            <div className="mt-3">
              <h6>Browser Info</h6>
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  User Agent: <small className="text-truncate" style={{ maxWidth: '500px' }}>{navigator.userAgent}</small>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  WebSocket Supported: <span>{typeof WebSocket !== 'undefined' ? 'Yes' : 'No'}</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <div>
          {showDebugInfo && (
            <Button variant="outline-secondary" className="me-2" onClick={handleRetryConnection}>
              Retry Connection
            </Button>
          )}
          {status === 'complete' && (
            <Button variant="primary" onClick={() => onComplete()}>
              View Report
            </Button>
          )}
          {status === 'error' && !showDebugInfo && (
            <Button variant="info" onClick={() => setError('Showing debug interface')}>
              Show Debug Info
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default StreamingSimulationDisplay;