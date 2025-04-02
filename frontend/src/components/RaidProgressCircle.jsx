import React from 'react';

function RaidProgressCircle({ completed, total, difficultyName, instanceName }) {
  // Calculate percentage
  const percentage = (completed / total) * 100;
  
  // Calculate circle values
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Define colors based on difficulty
  const getColorByDifficulty = (difficulty) => {
    const difficultyColors = {
      'LFR': '#5cb85c',       // Green
      'Normal': '#3498db',    // Blue
      'Heroic': '#9b59b6',    // Purple
      'Mythic': '#e74c3c'     // Red
    };
    
    return difficultyColors[difficulty] || '#777777';
  };
  
  const progressColor = getColorByDifficulty(difficultyName);
  
  return (
    <div className="position-relative d-flex flex-column align-items-center justify-content-center" style={{ width: '100px', height: '100px' }}>
      {/* SVG Circle */}
      <svg width="100" height="100" className="position-absolute">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#e6e6e6"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={progressColor}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      
      {/* Text content */}
      <div className="text-center position-relative">
        <div className="font-weight-bold" style={{ fontSize: '18px' }}>
          {completed}/{total}
        </div>
        <div className="small text-muted" style={{ fontSize: '10px' }}>
          {difficultyName}
        </div>
        <div className="small text-muted" style={{ fontSize: '10px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {instanceName}
        </div>
      </div>
    </div>
  );
}

export default RaidProgressCircle;