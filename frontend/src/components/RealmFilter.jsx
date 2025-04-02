import React, { useState, useEffect } from 'react';
import './RealmFilter.css';

function RealmFilter({ members, onFilterChange }) {
  const [realmFilters, setRealmFilters] = useState({});

  useEffect(() => {
    // Get unique realms from members
    const realms = [...new Set(members.map(member => member.character.realm.slug))];
    const initialRealmFilters = {
      checked: true,
      realms: realms.reduce((acc, realm) => {
        acc[realm] = true;
        return acc;
      }, {})
    };
    setRealmFilters(initialRealmFilters);
  }, [members]);

  const handleRealmChange = (realmSlug) => {
    setRealmFilters(prev => {
      const newRealms = {
        ...prev.realms,
        [realmSlug]: !prev.realms[realmSlug]
      };

      const allChecked = Object.values(newRealms).every(Boolean);
      const noneChecked = Object.values(newRealms).every(v => !v);

      return {
        checked: allChecked ? true : (noneChecked ? false : prev.checked),
        realms: newRealms
      };
    });
  };

  const handleToggleAll = () => {
    const newChecked = !realmFilters.checked;
    setRealmFilters({
      checked: newChecked,
      realms: Object.keys(realmFilters.realms).reduce((acc, realm) => {
        acc[realm] = newChecked;
        return acc;
      }, {})
    });
  };

  const resetRealmSelection = () => {
    setRealmFilters(prev => ({
      checked: true,
      realms: Object.keys(prev.realms).reduce((acc, realm) => {
        acc[realm] = true;
        return acc;
      }, {})
    }));
  };

  useEffect(() => {
    const activeRealms = Object.entries(realmFilters.realms)
      .filter(([_, isChecked]) => isChecked)
      .map(([realm, _]) => realm);
    onFilterChange(activeRealms);
  }, [realmFilters, onFilterChange]);

  if (!realmFilters.realms) return null;

  return (
    <div className="realm-filter-box">
      <label>
        <input
          type="checkbox"
          checked={realmFilters.checked}
          onChange={handleToggleAll}
        />
        All Realms
      </label>
      <div style={{ marginLeft: '20px' }}>
        {Object.entries(realmFilters.realms).map(([realmSlug, isChecked]) => (
          <label key={realmSlug}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleRealmChange(realmSlug)}
            />
            {realmSlug}
          </label>
        ))}
      </div>
      <button onClick={resetRealmSelection}>Reset selection</button>
    </div>
  );
}

export default RealmFilter;