`Simc.jsx`
```jsx
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  createContext,
  useContext,
  useReducer,
  memo
} from 'react';
import AddonInput from './AddonInput';
import ArmoryInput from './ArmoryInput';
import ItemSelect from './ItemSelect';
import fetchApi from '../../util/api';
import CollapsibleSection from './CollapsibleSection';
import CharacterDisplay from './CharacterDisplay';
import SimulationReport from './SimulationReport';
import CombinationsDisplay from './CombinationsDisplay';
import AdditionalOptions from './AdditionalOptions';
import AsyncSimulationDisplay from './AsyncSimulationDisplay';

const pairedSlots = {
  main_hand: 'off_hand',
  off_hand: 'main_hand',
  finger1: 'finger2',
  finger2: 'finger1',
  trinket1: 'trinket2',
  trinket2: 'trinket1'
};

const skippedSlots = ['tabard', 'shirt'];

const slotDisplayNames = {
  head: 'Head',
  neck: 'Neck',
  shoulder: 'Shoulders',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Wrists',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
  finger1: 'Ring 1',
  finger2: 'Ring 2',
  trinket1: 'Trinket 1',
  trinket2: 'Trinket 2',
  main_hand: 'Main Hand',
  off_hand: 'Off Hand'
};

// Simulation reducer
const SIMULATION_ACTIONS = {
  UPDATE_CHARACTER_DATA: 'UPDATE_CHARACTER_DATA',
  UPDATE_COMBINATIONS: 'UPDATE_COMBINATIONS',
  UPDATE_SIM_OPTIONS: 'UPDATE_SIM_OPTIONS',
  UPDATE_SIM_RESULT: 'UPDATE_SIM_RESULT',
  SET_SIMULATING: 'SET_SIMULATING',
  SET_ACTIVE_JOB: 'SET_ACTIVE_JOB'

};

const simulationReducer = (state, action) => {
  switch (action.type) {
    case SIMULATION_ACTIONS.UPDATE_CHARACTER_DATA:
      return { ...state, characterData: action.payload.character, itemsData: action.payload.items, simcInput: action.payload.simcInput };
    case SIMULATION_ACTIONS.UPDATE_COMBINATIONS:
      return { ...state, combinations: action.payload };
    case SIMULATION_ACTIONS.UPDATE_SIM_OPTIONS:
      return { ...state, simOptions: action.payload };
    case SIMULATION_ACTIONS.UPDATE_SIM_RESULT:
      return { ...state, simulationResult: action.payload };
    case SIMULATION_ACTIONS.SET_SIMULATING:
      return { ...state, isSimulating: action.payload };
    case SIMULATION_ACTIONS.SET_ACTIVE_JOB:
      return { ...state, activeJob: action.payload };
    default:
      return state;
  }
};

const initialSimulationState = {
  characterData: null,
  itemsData: null,
  simcInput: '',
  combinations: [],
  simOptions: {
    fightDuration: 300,
    optimalRaidBuffs: true,
    bloodlust: true,
    arcaneIntellect: true,
    battleShout: true,
    markOfTheWild: true,
    powerWordFortitude: true,
    chaosBrand: true,
    mysticTouch: true,
    skyfury: true,
    huntersMark: true,
    powerInfusion: false
  },
  simulationResult: null,
  isSimulating: false,
  activeJob: null

};

// Create context
const SimulationContext = createContext();
const SimulationDispatchContext = createContext();

// Custom hooks
function useSimulation() {
  return useContext(SimulationContext);
}

function useSimulationDispatch() {
  return useContext(SimulationDispatchContext);
}

// Memoized components
const MemoizedCharacterDisplay = memo(({ character }) => {
  return <CharacterDisplay character={character} />;
});

const MemoizedAdditionalOptions = memo(({ options, onChange }) => {
  return <AdditionalOptions options={options} onChange={onChange} />;
});

// Isolated EquipmentSection component
const EquipmentSection = memo(({ itemsData }) => {
  const dispatch = useSimulationDispatch();

  const preparedItems = useMemo(() => {
    if (!itemsData) return [];

    return Object.entries(itemsData)
      .filter(([slotKey, _]) => !skippedSlots.includes(slotKey))
      .map(([slotKey, data]) => {
        return {
          name: slotDisplayNames[slotKey] || slotKey.charAt(0).toUpperCase() + slotKey.slice(1).replace('_', ' '),
          slotKey: slotKey,
          equipped: data.equipped,
          alternatives: data.alternatives || []
        };
      });
  }, [itemsData]);

  const handleCombinationsGenerated = useCallback((newCombinations) => {
    dispatch({ type: SIMULATION_ACTIONS.UPDATE_COMBINATIONS, payload: newCombinations });
  }, [dispatch]);

  return (
    <CollapsibleSection title="Character Equipment">
      <ItemSelect
        slots={preparedItems}
        onCombinationsGenerated={handleCombinationsGenerated}
      />
    </CollapsibleSection>
  );
});

// Isolated CombinationsSection component
const CombinationsSection = memo(({ combinations, characterData, itemsData }) => {
  return (
    <CollapsibleSection title="Simulation Setup" defaultOpen={true}>
      <CombinationsDisplay
        combinations={combinations}
        characterData={characterData}
        itemsData={itemsData}
      />
    </CollapsibleSection>
  );
});

// Isolated SimulationResults component
const SimulationResults = memo(({ result, downloadReport }) => {
  return (
    result && (
      <CollapsibleSection title="Simulation Results">
        <SimulationReport htmlContent={result} height="500px" />
        <div className="d-flex justify-content-end mt-2">
          <button
            className="btn btn-secondary"
            onClick={downloadReport}
          >
            Download Report
          </button>
        </div>
      </CollapsibleSection>
    )
  );
});

// Simulation button component
const SimulationButton = memo(({ canSimulate, isSimulating, onRun }) => {
  return (
    canSimulate && (
      <div
        className="position-fixed bottom-0 start-0 w-100 bg-body py-3"
        style={{ zIndex: 1000 }}
      >
        <div className="container text-center">
          <button
            className="btn btn-primary"
            disabled={isSimulating}
            onClick={onRun}
          >
            {isSimulating ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Simulating...
              </>
            ) : 'Run Simulation'}
          </button>
        </div>
      </div>
    )
  );
});

function Simc() {
  const [inputMode, setInputMode] = useState('addon');
  const [realmIndex, setRealmIndex] = useState(null);
  const simulationResultRef = useRef(null);
  const [simulationState, dispatch] = useReducer(simulationReducer, initialSimulationState);

  useEffect(() => {
    const fetchRealms = async () => {
      try {
        const data = await fetchApi('/api/realms', true);
        setRealmIndex(data);
      } catch (error) {
        console.error('Error fetching realms:', error);
      }
    };

    fetchRealms();
  }, []);

  const handleDataUpdate = useCallback((data) => {
    if (data) {
      dispatch({
        type: SIMULATION_ACTIONS.UPDATE_CHARACTER_DATA,
        payload: {
          character: data.character,
          items: data.items,
          simcInput: inputMode === 'addon' ? data.rawInput : ''
        }
      });
    } else {
      dispatch({
        type: SIMULATION_ACTIONS.UPDATE_CHARACTER_DATA,
        payload: { character: null, items: null, simcInput: '' }
      });
    }
  }, [inputMode]);

  const handleOptionsChange = useCallback((newOptions) => {
    dispatch({ type: SIMULATION_ACTIONS.UPDATE_SIM_OPTIONS, payload: newOptions });
  }, []);

  const canSimulate = useMemo(() => {
    return simulationState.characterData && (
      (inputMode === 'addon' && simulationState.simcInput) ||
      (inputMode === 'armory' && simulationState.characterData.name && simulationState.characterData.realm.name)
    );
  }, [simulationState.characterData, inputMode, simulationState.simcInput]);

  // All formatting functions remain the same but are now memoized
  const formatItemForSimC = useCallback((slotKey, item) => {
    if (!item) return '';

    let output = `${slotKey}=,id=${item.id}`;

    if (item.enchant_id || item.enchant) {
      output += `,enchant_id=${item.enchant_id || item.enchant}`;
    }

    if ((item.gems && item.gems.length > 0) || (item.gem_id && item.gem_id.length > 0)) {
      const gems = item.gems || item.gem_id || [];
      if (gems.length > 0 && gems[0]) {
        output += `,gem_id=${gems.join('/')}`;
      }
    }

    if ((item.bonusIds && item.bonusIds.length > 0) || (item.bonus_list && item.bonus_list.length > 0) || (item.bonus_id && item.bonus_id.length > 0)) {
      const bonusList = item.bonusIds || item.bonus_list || item.bonus_id || [];
      if (bonusList.length > 0) {
        output += `,bonus_id=${bonusList.join('/')}`;
      }
    }

    if (item.crafted_stats && item.crafted_stats.length > 0) {
      output += `,crafted_stats=${item.crafted_stats.join('/')}`;
    }

    return output;
  }, []);

  const extractCharacterInfo = useCallback((simcInput) => {
    const charInfo = [];
    const lines = simcInput.split('\n');

    let detectedClass = '';
    for (const line of lines) {
      if (line.startsWith('spec=')) {
        const spec = line.substring(5).toLowerCase();
        const specClassMap = {
          subtlety: 'rogue',
          assassination: 'rogue',
          outlaw: 'rogue',
        };
        detectedClass = specClassMap[spec] || '';
        break;
      }
    }

    let characterName = 'Character';
    const commentLine = lines.find(line => line.startsWith('#'));
    if (commentLine) {
      const match = commentLine.match(/^#\s*([^\s-]+)/);
      if (match && match[1]) {
        characterName = match[1];
      }
    }

    if (detectedClass) {
      charInfo.push(`${detectedClass}="${characterName}"`);
    } else {
      charInfo.push(`rogue="${characterName}"`);
    }

    const settingsToExtract = [
      'level=', 'race=', 'region=', 'server=', 'role=', 'professions=',
      'spec=', 'talents=', 'covenant=', 'soulbind='
    ];

    lines.forEach(line => {
      if (!line.startsWith('#') && !line.startsWith('//')) {
        for (const setting of settingsToExtract) {
          if (line.startsWith(setting)) {
            charInfo.push(line.trim());
            break;
          }
        }
      }
    });

    return charInfo.join('\n');
  }, []);

  const createEquippedCombination = useCallback((itemsData) => {
    if (!itemsData) return null;

    const equippedGear = {};

    Object.entries(itemsData).forEach(([slotKey, data]) => {
      if (!skippedSlots.includes(slotKey) && data.equipped) {
        if (slotKey === 'rings') {
          if (Array.isArray(data.equipped)) {
            if (data.equipped[0]) equippedGear['finger1'] = data.equipped[0];
            if (data.equipped[1]) equippedGear['finger2'] = data.equipped[1];
          }
        } else {
          equippedGear[slotKey] = data.equipped;
        }
      }
    });

    return equippedGear;
  }, []);

  const addSimulationOptions = useCallback((inputText, simOptions) => {
    let options = [];

    options.push(`max_time=${simOptions.fightDuration}`);

    if (!simOptions.optimalRaidBuffs) {
      options.push('optimal_raid=0');

      options.push(`override.bloodlust=${simOptions.bloodlust ? 1 : 0}`);
      options.push(`override.arcane_intellect=${simOptions.arcaneIntellect ? 1 : 0}`);
      options.push(`override.battle_shout=${simOptions.battleShout ? 1 : 0}`);
      options.push(`override.mark_of_the_wild=${simOptions.markOfTheWild ? 1 : 0}`);
      options.push(`override.power_word_fortitude=${simOptions.powerWordFortitude ? 1 : 0}`);
      options.push(`override.chaos_brand=${simOptions.chaosBrand ? 1 : 0}`);
      options.push(`override.mystic_touch=${simOptions.mysticTouch ? 1 : 0}`);
      options.push(`override.skyfury=${simOptions.skyfury ? 1 : 0}`);
      options.push(`override.hunters_mark=${simOptions.huntersMark ? 1 : 0}`);
    }

    options.push(`external_buffs.power_infusion=${simOptions.powerInfusion ? 1 : 0}`);

    return `${inputText}\n\n# Simulation Options\n${options.join('\n')}`;
  }, []);

  const formatCombinations = useCallback((combinations, simcInput, itemsData) => {
    if (!combinations.length) return '';

    let combinationsText = '';
    const characterInfo = extractCharacterInfo(simcInput);

    combinationsText += `${characterInfo}\n\n`;

    const equippedGear = createEquippedCombination(itemsData);
    if (equippedGear) {
      combinationsText += `copy="Equipped"\n`;
      combinationsText += `### Currently Equipped Gear\n`;

      Object.entries(equippedGear).forEach(([slotKey, item]) => {
        const itemName = item.name || '';
        const itemLevel = item.itemLevel || item.level?.value || '';
        const itemInfo = [itemName, itemLevel].filter(Boolean).join(' ');

        if (itemInfo) {
          combinationsText += `# ${itemInfo}\n`;
        }

        combinationsText += `${formatItemForSimC(slotKey, item)}\n`;
      });

      combinationsText += '\n';
    }

    combinations.forEach((combo, index) => {
      const comboNumber = index + 1;
      combinationsText += `copy="Combo ${comboNumber}"\n`;
      combinationsText += `### Gear Combination ${comboNumber}\n`;

      Object.entries(combo).forEach(([slotKey, item]) => {
        const itemName = item.name || '';
        const itemLevel = item.itemLevel || item.level?.value || '';
        const itemInfo = [itemName, itemLevel].filter(Boolean).join(' ');

        if (itemInfo) {
          combinationsText += `# ${itemInfo}\n`;
        }

        combinationsText += `${formatItemForSimC(slotKey, item)}\n`;
      });

      combinationsText += '\n';
    });

    return addSimulationOptions(combinationsText, simulationState.simOptions);
  }, [extractCharacterInfo, createEquippedCombination, formatItemForSimC, addSimulationOptions]);

  const runSimulation = useCallback(async () => {
    if (!simulationState.characterData) return;

    dispatch({ type: SIMULATION_ACTIONS.SET_SIMULATING, payload: true });

    try {
      let input;

      if (inputMode === 'addon') {
        if (simulationState.combinations.length > 0) {
          input = formatCombinations(simulationState.combinations, simulationState.simcInput, simulationState.itemsData);
        } else {
          const lines = simulationState.simcInput.split('\n').filter(line => !line.startsWith('Simulation input:'));
          const characterInfo = extractCharacterInfo(simulationState.simcInput);

          const remainingLines = lines.filter(line => {
            if (line.startsWith('#') || line.startsWith('//')) return true;
            if (['level=', 'race=', 'region=', 'server=', 'role=', 'professions=',
              'spec=', 'talents=', 'covenant=', 'soulbind='].some(s => line.startsWith(s))) {
              return false;
            }
            return true;
          });

          input = characterInfo + '\n\n' + remainingLines.join('\n');
          input = addSimulationOptions(input, simulationState.simOptions);
        }
      } else {
        input = `armory=${simulationState.characterData.region},${simulationState.characterData.realm.name},${simulationState.characterData.name}`;
        input = addSimulationOptions(input, simulationState.simOptions);
      }

      console.log("Simulation input:", input);

      const base64Input = btoa(input);

      const response = await fetch('/api/simulate/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ simc_input: base64Input }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const jobData = await response.json();
      dispatch({
        type: SIMULATION_ACTIONS.SET_ACTIVE_JOB,
        payload: jobData.job_id
      });

    } catch (error) {
      console.error('Simulation error:', error);
      alert('Failed to start simulation: ' + error.message);
      dispatch({ type: SIMULATION_ACTIONS.SET_SIMULATING, payload: false });
    }
  }, [simulationState, inputMode, formatCombinations, extractCharacterInfo, addSimulationOptions]);

  const downloadReport = useCallback(() => {
    if (!simulationState.simulationResult) return;

    const blob = new Blob([simulationState.simulationResult], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${simulationState.characterData?.name || 'character'}_sim_report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [simulationState.simulationResult, simulationState.characterData]);

  return (
    <SimulationContext.Provider value={simulationState}>
      <SimulationDispatchContext.Provider value={dispatch}>
        <div className="container mt-3 pb-5 mb-5">
          {simulationState.activeJob && (
            <AsyncSimulationDisplay
              jobId={simulationState.activeJob}
              onClose={() => {
                dispatch({ type: SIMULATION_ACTIONS.SET_ACTIVE_JOB, payload: null });
                dispatch({ type: SIMULATION_ACTIONS.SET_SIMULATING, payload: false });
              }}
              onComplete={(result) => {
                dispatch({ type: SIMULATION_ACTIONS.UPDATE_SIM_RESULT, payload: result });
                dispatch({ type: SIMULATION_ACTIONS.SET_SIMULATING, payload: false });
              }}
            />
          )}

          <div className="mb-2">
            <input
              type="radio"
              className="btn-check"
              name="options-outlined"
              id="addon_radio"
              value="addon"
              checked={inputMode === 'addon'}
              onChange={(e) => {
                setInputMode(e.target.value);
                dispatch({
                  type: SIMULATION_ACTIONS.UPDATE_CHARACTER_DATA,
                  payload: { character: null, items: null, simcInput: '' }
                });
              }}
            />
            <label className="btn btn-outline-primary me-2" htmlFor="addon_radio">SimC Addon</label>

            <input
              type="radio"
              className="btn-check"
              name="options-outlined"
              id="armory_radio"
              value="armory"
              checked={inputMode === 'armory'}
              onChange={(e) => {
                setInputMode(e.target.value);
                dispatch({
                  type: SIMULATION_ACTIONS.UPDATE_CHARACTER_DATA,
                  payload: { character: null, items: null, simcInput: '' }
                });
              }}
            />
            <label className="btn btn-outline-primary" htmlFor="armory_radio">Armory</label>
          </div>

          {inputMode === 'addon' ? (
            <AddonInput
              onDataUpdate={handleDataUpdate}
              pairedSlots={pairedSlots}
              skippedSlots={skippedSlots}
            />
          ) : (
            <ArmoryInput
              onDataUpdate={handleDataUpdate}
              pairedSlots={pairedSlots}
              skippedSlots={skippedSlots}
              realmIndex={realmIndex}
            />
          )}

          <MemoizedCharacterDisplay character={simulationState.characterData} />

          {simulationState.characterData && (
            <EquipmentSection itemsData={simulationState.itemsData} />
          )}

          {simulationState.characterData && (
            <CollapsibleSection title="Additional Options">
              <MemoizedAdditionalOptions
                options={simulationState.simOptions}
                onChange={handleOptionsChange}
              />
            </CollapsibleSection>
          )}

          {simulationState.characterData && (
            <CombinationsSection
              combinations={simulationState.combinations}
              characterData={simulationState.characterData}
              itemsData={simulationState.itemsData}
            />
          )}

          <SimulationButton
            canSimulate={canSimulate}
            isSimulating={simulationState.isSimulating}
            onRun={runSimulation}
          />
        </div>
      </SimulationDispatchContext.Provider>
    </SimulationContext.Provider>
  );
}

export default Simc;
```

`SimulationReport.jsx`
```jsx
function SimulationReport({ htmlContent, onClose, jobId, height = '500px' }) {
    const downloadReport = () => {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sim_report_${jobId || 'character'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  
    if (onClose) {
      // Modal mode
      return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Simulation Results</h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <div className="modal-body p-0">
                <div style={{ height: '70vh', overflow: 'auto' }}>
                  <iframe
                    srcDoc={htmlContent}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    title="Simulation Report"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={downloadReport}
                >
                  Download Report
                </button>
                <button type="button" className="btn btn-primary" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Inline mode
      return (
        <div
          className="border rounded bg-light"
          style={{ height: height, overflow: 'auto' }}
        >
          <iframe
            srcDoc={htmlContent}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="Simulation Report"
          />
        </div>
      );
    }
  }
  
  export default SimulationReport;
```

