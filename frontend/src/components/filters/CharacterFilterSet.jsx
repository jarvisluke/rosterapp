import React from 'react';

function CharacterFilterSet({ filters }) {
  return (
    <div className="input-group mb-4">
      {filters.map((filter, index) => (
        <React.Fragment key={index}>
          {filter}
        </React.Fragment>
      ))}
    </div>
  );
}

export default CharacterFilterSet;