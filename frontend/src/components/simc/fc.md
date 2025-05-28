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
import StreamingSimulationDisplay from './StreamingSimulationDisplay';

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
  const [simulationInputText, setSimulationInputText] = useState(null);

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
  }, [extractCharacterInfo, createEquippedCombination, formatItemForSimC, addSimulationOptions, simulationState.simOptions]);

  const runSimulation = useCallback(() => {
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
      
      // Set the input text for the streaming component
      setSimulationInputText(input);

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
          {simulationInputText && (
            <StreamingSimulationDisplay
              simulationInput={simulationInputText}
              onClose={() => {
                setSimulationInputText(null);
                dispatch({ type: SIMULATION_ACTIONS.SET_SIMULATING, payload: false });
              }}
              onComplete={(result) => {
                if (result) {
                  dispatch({ type: SIMULATION_ACTIONS.UPDATE_SIM_RESULT, payload: result });
                }
                setSimulationInputText(null);
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

          <SimulationResults
            result={simulationState.simulationResult}
            downloadReport={downloadReport}
          />

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

`StreamingSimulationDisplay.jsx`
```jsx
import { useEffect, useState, useRef } from 'react';
import { Modal, Button, ProgressBar, Alert } from 'react-bootstrap';

const StreamingSimulationDisplay = ({ simulationInput, onClose, onComplete }) => {
  const [output, setOutput] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('connecting');
  const [resultUrl, setResultUrl] = useState(null);
  const [connectionLogs, setConnectionLogs] = useState([]);
  const socketRef = useRef(null);
  const outputContainerRef = useRef(null);
  
  const addLog = (message, type = 'info') => {
    console.log(`[WebSocket ${type}]:`, message);
    const timestamp = new Date().toISOString();
    setConnectionLogs(logs => [...logs, { timestamp, message, type }]);
  };

  useEffect(() => {
    // Log websocket creation
    addLog('Creating WebSocket connection...', 'init');
    
    // Determine the correct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = "localhost:8000";
    const url = `${protocol}//${host}/api/simulate/stream`;
    
    addLog(`Connecting to: ${url}`, 'init');
    
    // Create WebSocket connection
    const socket = new WebSocket(url);
    socketRef.current = socket;
    
    // Log socket properties
    addLog(`Socket created with readyState: ${socket.readyState}`, 'init');
    addLog(`Socket binary type: ${socket.binaryType}`, 'init');
    addLog(`Socket protocol: ${socket.protocol || 'none'}`, 'init');
    addLog(`Socket extensions: ${socket.extensions || 'none'}`, 'init');
    
    socket.onopen = (event) => {
      addLog('WebSocket connection opened', 'success');
      addLog(`readyState: ${socket.readyState}`, 'success');
      setStatus('connected');
      
      // Send the simulation input once connected
      try {
        const payload = JSON.stringify({ simc_input: btoa(simulationInput) });
        addLog(`Sending payload (length: ${payload.length})`, 'info');
        socket.send(payload);
        addLog('Payload sent successfully', 'success');
      } catch (err) {
        addLog(`Error sending payload: ${err.message}`, 'error');
        setError(`Failed to send simulation input: ${err.message}`);
      }
    };
    
    socket.onmessage = (event) => {
      try {
        addLog(`Received message (size: ${event.data.length})`, 'data');
        const data = JSON.parse(event.data);
        
        if (data.type === 'error') {
          addLog(`Error from server: ${data.content}`, 'error');
          setError(data.content);
          setStatus('error');
        } else if (data.type === 'complete') {
          addLog(`Simulation complete. Result URL: ${data.content}`, 'success');
          setStatus('complete');
          setResultUrl(data.content);
          fetchResult(data.content);
        } else {
          // Log progress updates less frequently to reduce noise
          if (data.progress && data.progress % 10 < 1) {
            addLog(`Progress update: ${Math.round(data.progress)}%`, 'progress');
          }
          
          // Append output
          setOutput(prev => [...prev, data]);
          
          // Update progress if available
          if (data.progress) {
            setProgress(data.progress);
          }
          
          // Auto-scroll to bottom
          if (outputContainerRef.current) {
            outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
          }
        }
      } catch (err) {
        addLog(`Error parsing message: ${err.message}`, 'error');
        addLog(`Raw message: ${event.data.substring(0, 200)}...`, 'error');
        setError(`Failed to parse server message: ${err.message}`);
      }
    };
    
    socket.onerror = (event) => {
      addLog('WebSocket error occurred', 'error');
      addLog(`readyState: ${socket.readyState}`, 'error');
      console.error('WebSocket error:', event);
      setError('Connection error. Check console for details.');
      setStatus('error');
    };
    
    socket.onclose = (event) => {
      addLog(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`, 'info');
      addLog(`Was clean? ${event.wasClean ? 'Yes' : 'No'}`, 'info');
      addLog(`Final readyState: ${socket.readyState}`, 'info');
      
      if (status !== 'complete' && status !== 'error') {
        setError(`Connection closed unexpectedly (code: ${event.code}, reason: ${event.reason || 'Not provided'})`);
        setStatus('error');
      }
    };
    
    // Cleanup function
    return () => {
      addLog('Component unmounting, closing WebSocket', 'cleanup');
      if (socket) {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          addLog(`Closing socket (current state: ${socket.readyState})`, 'cleanup');
          socket.close(1000, 'Component unmounted');
        } else {
          addLog(`Socket already closed/closing (state: ${socket.readyState})`, 'cleanup');
        }
      }
    };
  }, [simulationInput]);
  
  const fetchResult = async (resultPath) => {
    addLog(`Fetching result from: ${resultPath}`, 'info');
    try {
      const response = await fetch(`/${resultPath}`);
      if (!response.ok) {
        addLog(`Failed to fetch result: ${response.status} ${response.statusText}`, 'error');
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      addLog(`Result fetched successfully (size: ${htmlContent.length})`, 'success');
      onComplete(htmlContent);
    } catch (error) {
      addLog(`Error fetching result: ${error.message}`, 'error');
      console.error('Error fetching simulation result:', error);
      setError(`Failed to load simulation result: ${error.message}`);
      setStatus('error');
    }
  };
  
  const handleRetryConnection = () => {
    addLog('Manually retrying connection', 'info');
    // Close existing socket if open
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close(1000, 'Manual reconnect');
    }
    
    setStatus('connecting');
    setError(null);
    setOutput([]);
    setProgress(0);
    
    // Create new socket with same input
    // This will re-trigger the useEffect
    setConnectionLogs([]);
    setTimeout(() => {
      // Force re-render by setting state again
      setStatus('reconnecting');
    }, 100);
  };
  
  const formatOutput = (data) => {
    if (data.type === 'stdout') {
      return <div key={`line-${output.indexOf(data)}`} className="text-light">{data.content}</div>;
    } else if (data.type === 'stderr') {
      return <div key={`line-${output.indexOf(data)}`} className="text-danger">{data.content}</div>;
    }
    return null;
  };
  
  const handleCancel = () => {
    addLog('User cancelled simulation', 'info');
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      socketRef.current.close(1000, 'User cancelled');
    }
    onClose();
  };

  // Show connection debugging interface when there's an error
  const showDebugInfo = status === 'error';

  return (
    <Modal show={true} onHide={handleCancel} backdrop="static" size="lg">
      <Modal.Header closeButton>
        <Modal.Title>SimC Simulation {status === 'error' ? '- Error' : status === 'complete' ? '- Complete' : '- Running'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger">
            <strong>Error:</strong> {error}
            <Button variant="outline-danger" size="sm" className="float-end" onClick={handleRetryConnection}>
              Retry Connection
            </Button>
          </Alert>
        )}
        
        <div className="d-flex flex-column mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-bold">Status: {status.charAt(0).toUpperCase() + status.slice(1)}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar 
            now={progress} 
            variant={status === 'error' ? 'danger' : status === 'complete' ? 'success' : 'primary'} 
          />
        </div>
        
        <div 
          ref={outputContainerRef}
          className="bg-dark p-3 rounded" 
          style={{ 
            height: showDebugInfo ? '200px' : '400px', 
            overflow: 'auto', 
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {output.map(formatOutput)}
        </div>
        
        {showDebugInfo && (
          <div className="mt-3">
            <h5>Connection Debug Info</h5>
            <div className="bg-light p-2 rounded" style={{ maxHeight: '200px', overflow: 'auto' }}>
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Timestamp</th>
                    <th style={{ width: '100px' }}>Type</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {connectionLogs.map((log, idx) => (
                    <tr key={idx} className={log.type === 'error' ? 'table-danger' : log.type === 'success' ? 'table-success' : ''}>
                      <td className="text-muted small">{log.timestamp}</td>
                      <td><span className={`badge bg-${log.type === 'error' ? 'danger' : log.type === 'success' ? 'success' : 'info'}`}>{log.type}</span></td>
                      <td>{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-3">
              <h6>Current WebSocket State</h6>
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  ReadyState: 
                  <span className="badge bg-secondary">
                    {socketRef.current ? 
                      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][socketRef.current.readyState] || socketRef.current.readyState : 
                      'No Socket'}
                  </span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Protocol: <span>{socketRef.current?.protocol || 'none'}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Binary Type: <span>{socketRef.current?.binaryType || 'N/A'}</span>
                </li>
              </ul>
            </div>
            
            <div className="mt-3">
              <h6>Browser Info</h6>
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  User Agent: <small className="text-truncate" style={{ maxWidth: '500px' }}>{navigator.userAgent}</small>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  WebSocket Supported: <span>{typeof WebSocket !== 'undefined' ? 'Yes' : 'No'}</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <div>
          {showDebugInfo && (
            <Button variant="outline-secondary" className="me-2" onClick={handleRetryConnection}>
              Retry Connection
            </Button>
          )}
          {status === 'complete' && (
            <Button variant="primary" onClick={() => onComplete()}>
              View Report
            </Button>
          )}
          {status === 'error' && !showDebugInfo && (
            <Button variant="info" onClick={() => setError('Showing debug interface')}>
              Show Debug Info
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default StreamingSimulationDisplay;
```

`AsyncSimulationDisplay.jsx`
```jsx
import { useState, useEffect, useCallback } from 'react';
import SimulationReport from './SimulationReport';

function AsyncSimulationDisplay({ jobId, onClose, onComplete }) {
  const [status, setStatus] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/simulate/status/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to get status');
      }
      const data = await response.json();
      setStatus(data.status);
      setQueuePosition(data.queue_position);
      setEstimatedWait(data.estimated_wait);

      if (data.status === 'COMPLETED') {
        // Fetch result
        const resultResponse = await fetch(`/api/simulate/result/${jobId}`);
        if (!resultResponse.ok) {
          throw new Error('Failed to get result');
        }
        const resultContent = await resultResponse.text();
        setResult(resultContent);
        onComplete(resultContent);
      } else if (data.status === 'FAILED') {
        setError(data.error || 'Simulation failed');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [jobId, onComplete]);

  useEffect(() => {
    let intervalId;
    
    if (status !== 'COMPLETED' && status !== 'FAILED' && !error) {
      // Start checking status immediately
      checkStatus();
      
      // Then check every 5 seconds
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

