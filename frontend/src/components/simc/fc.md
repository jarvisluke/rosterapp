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
import { apiClient, ApiError } from '../../util/api';
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
  SET_SIMULATING: 'SET_SIMULATING'
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
  isSimulating: false
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
  const [currentJobId, setCurrentJobId] = useState(null);
  const resultsRef = useRef(null);
  const [isLoadingRealms, setIsLoadingRealms] = useState(true);

  useEffect(() => {
    const fetchRealms = async () => {
      setIsLoadingRealms(true);
      try {
        const data = await apiClient.get('/api/realms', {
          cache: true,
          cacheTTL: 1000 * 60 * 60 * 24,
          retries: 2,
          retryDelay: 1000,
        });
        setRealmIndex(data);
      } catch (error) {
        console.error('Error fetching realms:', error);

        if (error instanceof ApiError) {
          let errorMessage = 'Failed to load realm data.';

          if (error.isNetworkError) {
            errorMessage = 'Network error while loading realm data. Please check your connection.';
          } else if (error.isTimeoutError) {
            errorMessage = 'Timeout while loading realm data. Please try again.';
          } else if (error.isServerError) {
            errorMessage = 'Server error while loading realm data. Please try again later.';
          }

          if (!error.isNetworkError || process.env.NODE_ENV === 'development') {
            alert(errorMessage);
          }
        }
      } finally {
        setIsLoadingRealms(false);
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
  }, [extractCharacterInfo, createEquippedCombination, formatItemForSimC, addSimulationOptions, simulationState.simOptions]);

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

      // Submit simulation using the new API client
      const data = await apiClient.post('/api/simulate/async', {
        simc_input: btoa(input)
      }, {
        timeout: 10000, // 10 second timeout for submission
        retries: 2
      });

      console.log("Simulation queued with job ID:", data.job_id);
      setCurrentJobId(data.job_id);

    } catch (error) {
      console.error('Simulation error:', error);

      let errorMessage = 'Failed to start simulation';
      if (error instanceof ApiError) {
        if (error.isNetworkError) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.isTimeoutError) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.isServerError) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 400) {
          errorMessage = 'Invalid simulation input.';
        }
      }

      alert(errorMessage + (error.data?.detail ? `: ${error.data.detail}` : ''));
      dispatch({ type: SIMULATION_ACTIONS.SET_SIMULATING, payload: false });
    }
  }, [simulationState, inputMode, formatCombinations, extractCharacterInfo, addSimulationOptions]);

  // Also update the realm fetching in useEffect:
  useEffect(() => {
    const fetchRealms = async () => {
      try {
        const data = await apiClient.get('/api/realms', {
          cache: true,
          cacheTTL: 1000 * 60 * 60 * 24 // Cache for 24 hours
        });
        setRealmIndex(data);
      } catch (error) {
        console.error('Error fetching realms:', error);
        if (error instanceof ApiError && !error.isNetworkError) {
          // Only show error if it's not a network issue
          alert('Failed to load realm data. Some features may not work properly.');
        }
      }
    };

    fetchRealms();
  }, []);
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

  const scrollToResults = useCallback(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleSimulationComplete = useCallback((result) => {
    if (result) {
      dispatch({ type: SIMULATION_ACTIONS.UPDATE_SIM_RESULT, payload: result });
      // Add small delay to ensure the results are rendered before scrolling
      setTimeout(() => scrollToResults(), 100);
    }
    setCurrentJobId(null);
    dispatch({ type: SIMULATION_ACTIONS.SET_SIMULATING, payload: false });
  }, [scrollToResults]);

  const handleSimulationClose = useCallback(() => {
    setCurrentJobId(null);
    dispatch({ type: SIMULATION_ACTIONS.SET_SIMULATING, payload: false });
  }, []);

  return (
    <SimulationContext.Provider value={simulationState}>
      <SimulationDispatchContext.Provider value={dispatch}>
        <div className="container mt-3 pb-5 mb-5">
          {currentJobId && (
            <AsyncSimulationDisplay
              jobId={currentJobId}
              onClose={handleSimulationClose}
              onComplete={handleSimulationComplete}
            />
          )}

          <div ref={resultsRef}>
            <SimulationResults
              result={simulationState.simulationResult}
              downloadReport={downloadReport}
            />
          </div>

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
              isLoadingRealms={isLoadingRealms}
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

`AsyncSimulationDisplay.jsx`
```jsx
import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../../util/api';
import SimulationReport from './SimulationReport';

function AsyncSimulationDisplay({ jobId, onClose, onComplete }) {
  const [status, setStatus] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const checkStatus = useCallback(async () => {
    try {
      const data = await apiClient.get(`/api/simulate/status/${jobId}`, {
        timeout: 10000,
        retries: 3,
        retryDelay: 1000
      });
      
      setStatus(data.status);
      setQueuePosition(data.queue_position);
      setEstimatedWait(data.estimated_wait);

      if (data.status === 'COMPLETED') {
        try {
          const resultContent = await apiClient.get(`/api/simulate/result/${jobId}`, {
            timeout: 30000,
            retries: 2
          });
          setResult(resultContent);
          onComplete(resultContent);
        } catch (resultError) {
          console.error('Error fetching result:', resultError);
          setError('Failed to load simulation result');
        }
      } else if (data.status === 'FAILED') {
        setError(data.error || 'Simulation failed');
      }
    } catch (err) {
      console.error('Error checking status:', err);
      
      if (err instanceof ApiError) {
        if (err.isNetworkError) {
          setError('Connection lost. Retrying...');
        } else if (err.status === 404) {
          setError('Simulation job not found');
        } else {
          setError(`Failed to check status: ${err.message}`);
        }
      } else {
        setError('Unknown error occurred');
      }
    }
  }, [jobId, onComplete]);

  useEffect(() => {
    let intervalId;
    
    if (status !== 'COMPLETED' && status !== 'FAILED' && !error) {
      checkStatus();
      intervalId = setInterval(checkStatus, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status, error, checkStatus]);

  const formatWaitTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  if (error) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title">Simulation Error</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p className="text-danger">{error}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'COMPLETED' && result) {
    return (
      <SimulationReport 
        htmlContent={result}
        onClose={onClose}
        jobId={jobId}
      />
    );
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Simulation in Progress</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center">
            <div className="mb-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h6>Status: {status}</h6>
            {queuePosition > 0 && (
              <p>Queue Position: {queuePosition}</p>
            )}
            {estimatedWait && (
              <p>Estimated Wait: {formatWaitTime(estimatedWait)}</p>
            )}
            <small className="text-muted">
              Job ID: {jobId}
            </small>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AsyncSimulationDisplay;
```

`AdditionalOptions.jsx`
```jsx
import React from 'react';

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
```

`CombinationsDisplay.jsx`
```jsx
function CombinationsDisplay({ combinations, characterData, itemsData }) {
  // Check if we have any combinations (including the equipped gear combination)
  const hasCombinations = combinations && combinations.length > 0;
  
  // If no combinations are selected, we still have the equipped gear as a single combination
  const totalCombinations = hasCombinations ? combinations.length : 1;
  const hasAlternatives = hasCombinations && combinations.length > 1;

  return (
    <div className="alert alert-info mb-3">
      <h6 className="alert-heading mb-2">
        Ready to simulate {totalCombinations} {totalCombinations === 1 ? 'combination' : 'combinations'}
      </h6>
      <p className="mb-0 small">
        {hasCombinations && hasAlternatives ? (
          `Including your currently equipped gear and ${combinations.length - 1} ${combinations.length === 2 ? 'alternative' : 'alternatives'}`
        ) : (
          'Using your currently equipped gear only'
        )}
      </p>
    </div>
  );
}

export default CombinationsDisplay;
```

