import React, { useState } from 'react';

const initialClassFilters = {
  checked: true,
  classes: {
    'Warrior': true,
    'Paladin': true,
    'Hunter': true,
    'Rogue': true,
    'Priest': true,
    'Shaman': true,
    'Mage': true,
    'Warlock': true,
    'Monk': true,
    'Druid': true,
    'Demon Hunter': true,
    'Death Knight': true,
    'Evoker': true,
  }
};

function ClassFilter({ onFilterChange }) {
  const [classFilters, setClassFilters] = useState(initialClassFilters);

  const handleClassChange = (className) => {
    setClassFilters(prev => {
      const newClasses = {
        ...prev.classes,
        [className]: !prev.classes[className]
      };

      const allChecked = Object.values(newClasses).every(Boolean);
      const noneChecked = Object.values(newClasses).every(v => !v);

      return {
        checked: allChecked ? true : (noneChecked ? false : prev.checked),
        classes: newClasses
      };
    });
  };

  const handleUnselectAll = () => {
    setClassFilters({
      checked: false,
      classes: Object.keys(classFilters.classes).reduce((acc, cls) => {
        acc[cls] = false;
        return acc;
      }, {})
    });
  }

  const resetClassSelection = () => {
    setClassFilters(initialClassFilters);
  };

  React.useEffect(() => {
    const activeClasses = Object.entries(classFilters.classes)
      .filter(([_, isChecked]) => isChecked)
      .map(([cls, _]) => cls);
    onFilterChange(activeClasses);
  }, [classFilters, onFilterChange]);

  return (
    <div>
      {Object.entries(classFilters.classes).map(([className, isChecked]) => (
        <div className="form-check mb-2" key={className}>
          <input
            className="form-check-input"
            type="checkbox"
            id={`class-${className}`}
            checked={isChecked}
            onChange={() => handleClassChange(className)}
          />
          <label className="form-check-label" htmlFor={`class-${className}`}>
            {className}
          </label>
        </div>
      ))}
      <div className="mt-3">
        <button 
          className="btn btn-secondary btn-sm me-2"
          onClick={resetClassSelection}
        >
          Select All
        </button>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={handleUnselectAll}
        >
          Unselect All
        </button>
      </div>
    </div>
  );
}

export default ClassFilter;