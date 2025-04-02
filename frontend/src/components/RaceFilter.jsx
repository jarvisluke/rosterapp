import React, { useState, useEffect } from 'react';

const initialRaceFilters = {
  horde: {
    checked: true,
    races: {
      'Orc': true,
      'Undead': true,
      'Tauren': true,
      'Troll': true,
      'Blood Elf': true,
      'Goblin': true,
      'Mag\'har Orc': true,
      'Nightborne': true,
      'Highmountain Tauren': true,
      'Zandalari Troll': true,
      'Vulpera': true,
    }
  },
  alliance: {
    checked: true,
    races: {
      'Human': true,
      'Dwarf': true,
      'Night Elf': true,
      'Gnome': true,
      'Draenei': true,
      'Worgen': true,
      'Void Elf': true,
      'Lightforged Draenei': true,
      'Dark Iron Dwarf': true,
      'Kul Tiran': true,
      'Mechagnome': true,
    }
  },
  other: {
    checked: true,
    races: {
      'Pandaren': true,
      'Dracthyr': true,
    }
  }
};

function RaceFilter({ onFilterChange }) {
  const [raceFilters, setRaceFilters] = useState(initialRaceFilters);

  const handleFactionChange = (faction) => {
    setRaceFilters(prev => {
      const newChecked = !prev[faction].checked;
      return {
        ...prev,
        [faction]: {
          checked: newChecked,
          races: Object.keys(prev[faction].races).reduce((acc, race) => {
            acc[race] = newChecked;
            return acc;
          }, {})
        }
      };
    });
  };

  const handleRaceChange = (faction, race) => {
    setRaceFilters(prev => {
      const newRaces = {
        ...prev[faction].races,
        [race]: !prev[faction].races[race]
      };

      const allChecked = Object.values(newRaces).every(Boolean);
      
      return {
        ...prev,
        [faction]: {
          checked: allChecked,
          races: newRaces
        }
      };
    });
  };

  const resetRaceSelection = () => {
    setRaceFilters(initialRaceFilters);
  };

  useEffect(() => {
    const activeRaces = Object.entries(raceFilters).flatMap(([_, { races }]) => 
      Object.entries(races)
        .filter(([_, isChecked]) => isChecked)
        .map(([race, _]) => race)
    );
    onFilterChange(activeRaces);
  }, [raceFilters, onFilterChange]);

  return (
    <div>
      {Object.entries(raceFilters).map(([faction, { checked, races }]) => (
        <div key={faction} className="mb-3">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id={`faction-${faction}`}
              checked={checked}
              onChange={() => handleFactionChange(faction)}
            />
            <label className="form-check-label fw-bold" htmlFor={`faction-${faction}`}>
              {faction.charAt(0).toUpperCase() + faction.slice(1)}
            </label>
          </div>
          <div className="ms-4">
            {Object.entries(races).map(([race, isChecked]) => (
              <div className="form-check" key={race}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`race-${race}`}
                  checked={isChecked}
                  onChange={() => handleRaceChange(faction, race)}
                />
                <label className="form-check-label" htmlFor={`race-${race}`}>
                  {race}
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        className="btn btn-secondary btn-sm mt-2"
        onClick={resetRaceSelection}
      >
        Reset selection
      </button>
    </div>
  );
}

export default RaceFilter;