import React from 'react';

function CharacterTextFilter({ value, onChange, buttonText }) {
  return (
    <input
      type="text"
      className="form-control"
      placeholder={buttonText}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default CharacterTextFilter;