import { useState, useEffect, useCallback, useMemo, } from 'react';

const DEFAULT_OPTIONS = {
  general: {
    fightDuration: {
      value: 300,
      displayName: 'Fight Duration',
      min: 60,
      max: 600,
      step: 10,
      unit: 'seconds',
      type: 'range'
    },
    optimalRaidBuffs: {
      value: true,
      displayName: 'Use Optimal Raid Buffs',
      type: 'checkbox'
    }
  },
  buffs: {
    // Raid buffs
    bloodlust: {
      value: true,
      displayName: 'Bloodlust',
      category: 'override'
    },
    arcaneIntellect: {
      value: true,
      displayName: 'Arcane Intellect',
      category: 'override'
    },
    battleShout: {
      value: true,
      displayName: 'Battle Shout',
      category: 'override'
    },
    markOfTheWild: {
      value: true,
      displayName: 'Mark of the Wild',
      category: 'override'
    },
    powerWordFortitude: {
      value: true,
      displayName: 'Power Word: Fortitude',
      category: 'override'
    },
    chaosBrand: {
      value: true,
      displayName: 'Chaos Brand',
      category: 'override'
    },
    mysticTouch: {
      value: true,
      displayName: 'Mystic Touch',
      category: 'override'
    },
    skyfury: {
      value: true,
      displayName: 'Skyfury Totem',
      category: 'override'
    },
    huntersMark: {
      value: true,
      displayName: 'Hunter\'s Mark',
      category: 'override'
    },
    // External buffs
    powerInfusion: {
      value: false,
      displayName: 'Power Infusion',
      category: 'external_buffs'
    }
  }
};

const AdditionalOptions = ({ options = DEFAULT_OPTIONS, onChange }) => {
  const [localOptions, setLocalOptions] = useState(options);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  const handleChange = useCallback((section, key, newValue) => {
    setLocalOptions(prev => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: {
            ...prev[section][key],
            value: newValue
          }
        }
      };

      if (onChange) {
        onChange(updated);
      }

      return updated;
    });
  }, [onChange]);

  const handleGeneralOptionChange = useCallback((key, value) => {
    setLocalOptions(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [key]: {
          ...prev.general[key],
          value: value
        }
      }
    }));
  }, []);

  const handleBuffChange = useCallback((buffId, value) => {
    setLocalOptions(prev => ({
      ...prev,
      buffs: {
        ...prev.buffs,
        [buffId]: {
          ...prev.buffs[buffId],
          value: value
        }
      }
    }));
  }, []);

  // Memoized grouping of buffs by category
  const buffsByCategory = useMemo(() => {
    return Object.entries(localOptions.buffs).reduce((acc, [id, buff]) => {
      if (!acc[buff.category]) acc[buff.category] = [];
      acc[buff.category].push({ id, ...buff });
      return acc;
    }, {});
  }, [localOptions.buffs]);

  return (
    <div className="additional-options ms-3">
      {/* General Options */}
      {Object.entries(localOptions.general).map(([key, option]) => (
        <div key={key} className="mb-3">
          {option.type === 'range' ? (
            <>
              <label htmlFor={key} className="form-label">
                {option.displayName}: {option.value} {option.unit || ''}
              </label>
              <input
                type="range"
                className="form-range"
                id={key}
                min={option.min || 0}
                max={option.max || 100}
                step={option.step || 1}
                value={option.value}
                onChange={(e) => handleGeneralOptionChange(key, Number(e.target.value))}
              />
            </>
          ) : option.type === 'checkbox' ? (
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id={key}
                checked={option.value}
                onChange={(e) => handleGeneralOptionChange(key, e.target.checked)}
              />
              <label className="form-check-label" htmlFor={key}>
                {option.displayName}
              </label>
            </div>
          ) : null}
        </div>
      ))}

      {/* Override Buffs (raid buffs - if not using optimal raid buffs) */}
      {!localOptions.general.optimalRaidBuffs.value && buffsByCategory.override && (
        <div className="raid-buffs-container ms-4 mb-3">
          <div className="row">
            <div className="col-md-6">
              {buffsByCategory.override.slice(0, Math.ceil(buffsByCategory.override.length / 2)).map(buff => (
                <div key={buff.id} className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={buff.id}
                    checked={buff.value}
                    onChange={(e) => handleBuffChange(buff.id, e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor={buff.id}>
                    {buff.displayName}
                  </label>
                </div>
              ))}
            </div>
            <div className="col-md-6">
              {buffsByCategory.override.slice(Math.ceil(buffsByCategory.override.length / 2)).map(buff => (
                <div key={buff.id} className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={buff.id}
                    checked={buff.value}
                    onChange={(e) => handleBuffChange(buff.id, e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor={buff.id}>
                    {buff.displayName}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* External Buffs (always shown) */}
      {buffsByCategory.external_buffs && (
        <div className="external-buffs-container mb-3">
          {buffsByCategory.external_buffs.map(buff => (
            <div key={buff.id} className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id={buff.id}
                checked={buff.value}
                onChange={(e) => handleBuffChange(buff.id, e.target.checked)}
              />
              <label className="form-check-label" htmlFor={buff.id}>
                {buff.displayName}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

AdditionalOptions.defaultProps = {
  options: DEFAULT_OPTIONS,
  onChange: () => {}
};

export default AdditionalOptions;
export { DEFAULT_OPTIONS };