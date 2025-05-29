const AdditionalOptions = ({ options, onChange }) => {
  const handleOptionChange = (key, value) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="additional-options">
      <div className="mb-3">
        <label htmlFor="fightDuration" className="form-label">
          Fight Duration: {options.fightDuration} seconds
        </label>
        <input
          type="range"
          className="form-range"
          id="fightDuration"
          min="60"
          max="600"
          step="10"
          value={options.fightDuration}
          onChange={(e) => handleOptionChange('fightDuration', parseInt(e.target.value))}
        />
      </div>

      <div className="mb-3 form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id="optimalRaidBuffs"
          checked={options.optimalRaidBuffs}
          onChange={(e) => handleOptionChange('optimalRaidBuffs', e.target.checked)}
        />
        <label className="form-check-label" htmlFor="optimalRaidBuffs">
          Use Optimal Raid Buffs
        </label>
      </div>

      {!options.optimalRaidBuffs && (
        <div className="raid-buffs-container ms-4 mb-3">
          <div className="row">
            <div className="col-md-6">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="bloodlust"
                  checked={options.bloodlust}
                  onChange={(e) => handleOptionChange('bloodlust', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="bloodlust">
                  Bloodlust / Heroism
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="arcaneIntellect"
                  checked={options.arcaneIntellect}
                  onChange={(e) => handleOptionChange('arcaneIntellect', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="arcaneIntellect">
                  Arcane Intellect
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="battleShout"
                  checked={options.battleShout}
                  onChange={(e) => handleOptionChange('battleShout', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="battleShout">
                  Battle Shout
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="markOfTheWild"
                  checked={options.markOfTheWild}
                  onChange={(e) => handleOptionChange('markOfTheWild', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="markOfTheWild">
                  Mark of the Wild
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="powerWordFortitude"
                  checked={options.powerWordFortitude}
                  onChange={(e) => handleOptionChange('powerWordFortitude', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="powerWordFortitude">
                  Power Word: Fortitude
                </label>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="chaosBrand"
                  checked={options.chaosBrand}
                  onChange={(e) => handleOptionChange('chaosBrand', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="chaosBrand">
                  Chaos Brand
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="mysticTouch"
                  checked={options.mysticTouch}
                  onChange={(e) => handleOptionChange('mysticTouch', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="mysticTouch">
                  Mystic Touch
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="skyfury"
                  checked={options.skyfury}
                  onChange={(e) => handleOptionChange('skyfury', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="skyfury">
                  Skyfury Totem
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="huntersMark"
                  checked={options.huntersMark}
                  onChange={(e) => handleOptionChange('huntersMark', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="huntersMark">
                  Hunter's Mark
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id="powerInfusion"
          checked={options.powerInfusion}
          onChange={(e) => handleOptionChange('powerInfusion', e.target.checked)}
        />
        <label className="form-check-label" htmlFor="powerInfusion">
          Power Infusion
        </label>
      </div>
    </div>
  );
};

export default AdditionalOptions;