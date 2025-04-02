import React from 'react';

function CharacterSelectFilter({ value, onChange, buttonText, options }) {
  return (
    <select
      className={`form-select ${value === '' ? 'text-muted' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: 'auto' }}
    >
      <option value="" className="text-muted">{buttonText}</option>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

export default CharacterSelectFilter;