import { useState, useEffect } from 'react';

function WorkerTest() {
  const [testStatus, setTestStatus] = useState('idle');
  const [testResult, setTestResult] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);

  const testAsyncSystem = async () => {
    setTestStatus('testing');
    try {
      // Simple test input
      const testInput = `rogue="TestCharacter"\nlevel=70\nspec=subtlety`;
      const base64Input = btoa(testInput);
      
      // Queue test job
      const response = await fetch('/api/simulate/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ simc_input: base64Input }),
      });
      
      const result = await response.json();
      setJobId(result.job_id);
      setJobStatus(result);
      
      // Poll status until complete
      const checkStatus = setInterval(async () => {
        const statusResponse = await fetch(`/api/simulate/status/${result.job_id}`);
        const status = await statusResponse.json();
        setJobStatus(status);
        
        if (status.status === 'COMPLETED') {
          clearInterval(checkStatus);
          const resultResponse = await fetch(`/api/simulate/result/${result.job_id}`);
          const htmlContent = await resultResponse.text();
          setTestResult(htmlContent ? 'Success' : 'Empty result');
          setTestStatus('success');
        } else if (status.status === 'FAILED') {
          clearInterval(checkStatus);
          setTestResult(`Failed: ${status.error || 'Unknown error'}`);
          setTestStatus('error');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult(`Error: ${error.message}`);
      setTestStatus('error');
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-warning">
        <h5>System Test</h5>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <button 
            className="btn btn-primary" 
            onClick={testAsyncSystem}
            disabled={testStatus === 'testing'}
          >
            {testStatus === 'testing' ? 'Testing...' : 'Test Async System'}
          </button>
        </div>
        
        {jobStatus && (
          <div className="alert alert-info">
            <strong>Job ID:</strong> {jobId}<br />
            <strong>Status:</strong> {jobStatus.status}<br />
            {jobStatus.queue_position && (
              <><strong>Queue position:</strong> {jobStatus.queue_position}<br /></>
            )}
            {jobStatus.started_at && (
              <><strong>Started at:</strong> {new Date(jobStatus.started_at).toLocaleTimeString()}<br /></>
            )}
            {jobStatus.completed_at && (
              <><strong>Completed at:</strong> {new Date(jobStatus.completed_at).toLocaleTimeString()}<br /></>
            )}
          </div>
        )}
        
        {testResult && (
          <div className={`alert ${testStatus === 'success' ? 'alert-success' : 'alert-danger'}`}>
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkerTest;