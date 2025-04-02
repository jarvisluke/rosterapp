import React from 'react';

function CharacterCheckboxFilter({ value, onChange, buttonText }) {
  return (
    <span className="input-group-text d-flex align-items-center">
      <label htmlFor={buttonText}>{buttonText}</label>
      <input
        type="checkbox"
        className="form-check-input ms-2"
        id={buttonText}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </span>
  );
}

export default CharacterCheckboxFilter;