import { useState } from "react";

function CollapsibleSection({ title, children, initialExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  return (
    <div className="mb-4">
      <div
        className="d-flex justify-content-between align-items-center p-2 border-bottom"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h5 className="m-1">{title}</h5>
        <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
      </div>
      <div
        className="overflow-hidden"
        style={{
          maxHeight: isExpanded ? '2000px' : '0',
          opacity: isExpanded ? 1 : 0,
          transition: `max-height 0.5s ease-in-out, opacity ${isExpanded ? '0.5s' : '0.3s'} ease-in-out`
        }}
      >
        <div className="pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection