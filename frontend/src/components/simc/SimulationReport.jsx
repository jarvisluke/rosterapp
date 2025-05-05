function SimulationReport({ htmlContent, onClose, jobId, height = '500px' }) {
    const downloadReport = () => {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sim_report_${jobId || 'character'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  
    if (onClose) {
      // Modal mode
      return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Simulation Results</h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <div className="modal-body p-0">
                <div style={{ height: '70vh', overflow: 'auto' }}>
                  <iframe
                    srcDoc={htmlContent}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    title="Simulation Report"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={downloadReport}
                >
                  Download Report
                </button>
                <button type="button" className="btn btn-primary" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Inline mode
      return (
        <div
          className="border rounded bg-light"
          style={{ height: height, overflow: 'auto' }}
        >
          <iframe
            srcDoc={htmlContent}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="Simulation Report"
          />
        </div>
      );
    }
  }
  
  export default SimulationReport;