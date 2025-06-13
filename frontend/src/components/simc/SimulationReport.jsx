import { useCallback, memo } from 'react';
import CollapsibleSection from './CollapsibleSection';

const SimulationReport = memo(({ htmlContent, height = "500px", characterName = 'character' }) => {
  const downloadReport = useCallback(() => {
    if (!htmlContent) return;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${characterName}_sim_report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [htmlContent, characterName]);

  if (!htmlContent) {
    return null;
  }

  return (
    <CollapsibleSection title="Simulation Results">
      <iframe
        srcDoc={htmlContent}
        style={{ width: '100%', height, border: 'none' }}
        title="Simulation Report"
      />
      <div className="d-flex justify-content-end mt-2">
        <button
          className="btn btn-secondary"
          onClick={downloadReport}
        >
          Download Report
        </button>
      </div>
    </CollapsibleSection>
  );
});

export default SimulationReport;