import React, { useEffect, useState } from 'react';

function CharacterDropdownFilter({ filterData, onChange, buttonText, variant = 'secondary' }) {
  const [isModified, setIsModified] = useState(false);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    if (!initialData) {
      setInitialData(JSON.parse(JSON.stringify(filterData)));
    }
  }, [filterData]);

  const handleCheckboxChange = (path) => {
    const newFilterData = { ...filterData };
    let current = newFilterData;

    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    const lastKey = path[path.length - 1];
    current[lastKey].checked = !current[lastKey].checked;

    if (Object.keys(current[lastKey]).length > 1) {
      Object.keys(current[lastKey]).forEach(key => {
        if (key !== 'checked') {
          current[lastKey][key].checked = current[lastKey].checked;
        }
      });
    }

    if (path.length > 1) {
      const parentPath = path.slice(0, -1);
      let parent = newFilterData;
      for (let i = 0; i < parentPath.length - 1; i++) {
        parent = parent[parentPath[i]];
      }
      const parentKey = parentPath[parentPath.length - 1];
      parent[parentKey].checked = Object.keys(parent[parentKey])
        .filter(key => key !== 'checked')
        .every(key => parent[parentKey][key].checked);
    }

    setIsModified(JSON.stringify(newFilterData) !== JSON.stringify(initialData));
    onChange(newFilterData);
  };

  const handleReset = (e) => {
    e.stopPropagation();
    if (initialData) {
      onChange(JSON.parse(JSON.stringify(initialData)));
      setIsModified(false);
      // Manually close dropdown
      const dropdownMenu = e.target.closest('.dropdown-menu');
      if (dropdownMenu) {
        const dropdownToggle = document.querySelector(`[data-bs-toggle="dropdown"][aria-expanded="true"]`);
        if (dropdownToggle) {
          dropdownToggle.click();
        }
      }
    }
  };

  const renderCheckboxes = (data, path = []) => {
    return Object.entries(data).map(([key, value], index, arr) => {
      if (key === 'checked') return null;

      const newPath = [...path, key];
      const hasChildren = Object.keys(value).length > 1;
      const isLastItem = index === arr.length - 1;

      return (
        <div key={key} className="position-relative">
          <div className="d-flex align-items-center">
            {path.length > 0 && (
              <div 
                className="position-absolute" 
              />
            )}
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={value.checked}
                onChange={() => handleCheckboxChange(newPath)}
              />
              <span className="form-check-label" style={{ whiteSpace: 'nowrap' }}>
                {key}
              </span>
            </div>
          </div>
          {hasChildren && (
            <div 
              className="position-relative ms-4"
            >
              {renderCheckboxes(value, newPath)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <button
        className={`btn btn-${isModified ? '' : 'outline-'}${variant} dropdown-toggle`}
        type="button"
        data-bs-toggle="dropdown"
      >
        {buttonText}
      </button>
      <div className="dropdown-menu p-3" style={{ minWidth: '250px' }}>
        {renderCheckboxes(filterData)}
        <div className="mt-3 text-center">
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}

export default CharacterDropdownFilter;