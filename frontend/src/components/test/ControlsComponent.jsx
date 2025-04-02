import React from 'react';
import { ChromePicker } from 'react-color';

const ControlsComponent = ({ color, onColorChange, onReset, onRandomize, lightIntensity, onLightChange }) => {
  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
      <ChromePicker color={color} onChangeComplete={onColorChange} />
      <button onClick={onReset} style={{ marginTop: 10 }}>Reset</button>
      <button onClick={onRandomize} style={{ marginTop: 10, marginLeft: 10 }}>Randomize</button>
      <div style={{ marginTop: 10 }}>
        <label>Light Intensity: </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={lightIntensity}
          onChange={e => onLightChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};

export default ControlsComponent;