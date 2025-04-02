import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import AddonInput from './AddonInput';
import ArmoryInput from './ArmoryInput';
import ItemSelect from './ItemSelect';
import fetchApi from '../../util/api';
import CollapsibleSection from './CollapsibleSection';
import CharacterDisplay from './CharacterDisplay';
import SimulationReport from './SimulationReport';

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

function Simc() {
  const [inputMode, setInputMode] = useState('addon');
  const [characterData, setCharacterData] = useState(null);
  const [itemsData, setItemsData] = useState(null);
  const [realmIndex, setRealmIndex] = useState(null);
  const [simcInput, setSimcInput] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationResultRef = useRef(null);
  const [combinations, setCombinations] = useState([]);


  // Fetch realms once on component mount
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

  // For addon input, we need to store the raw SimC input
  const handleDataUpdate = (data) => {
    if (data) {
      setCharacterData(data.character);
      setItemsData(data.items);
      if (inputMode === 'addon') {
        setSimcInput(data.rawInput); // Store the raw input from addon
      }
    } else {
      setCharacterData(null);
      setItemsData(null);
      setSimcInput('');
    }
  };

  const handleCombinationsGenerated = useCallback((newCombinations) => {
    setCombinations(newCombinations);
    console.log("Received combinations:", newCombinations);
  }, []);

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

  const formatItemForSimc = (item) => {
    if (!item) return '';
    
    let output = `${item.id}`;
    
    if (item.gem_id && item.gem_id.length) {
      output += `,gem_id=${item.gem_id.join('/')}`;
    }
    
    if (item.bonus_id && item.bonus_id.length) {
      output += `,bonus_id=${item.bonus_id.join('/')}`;
    }
    
    if (item.enchant_id) {
      output += `,enchant_id=${item.enchant_id}`;
    }
    
    if (item.crafted_stats && item.crafted_stats.length) {
      output += `,crafted_stats=${item.crafted_stats.join('/')}`;
    }
    
    return output;
  };

  const formatCombinations = () => {
    if (!combinations.length) return '';
    
    let combinationsText = '';
    
    combinations.forEach((combo, index) => {
      combinationsText += `\ncopy="Combo ${index + 1}"\n`;
      combinationsText += `### Combo ${index + 1}\n`;
      
      // Add each item in the combination
      Object.entries(combo).forEach(([slotKey, item]) => {
        const itemName = item.name || slotKey;
        const itemLevel = item.item_level ? ` ${item.item_level}` : '';
        combinationsText += `# ${itemName}${itemLevel}\n`;
        combinationsText += `${slotKey}=,id=${formatItemForSimc(item)}\n`;
      });
  
      // Copy talents from base profile
      const talentMatch = /talents=([^\n]*)/.exec(simcInput);
      if (talentMatch) {
        combinationsText += `talents=${talentMatch[1]}\n`;
      }
    });
    
    return combinationsText;
  };

  const runSimulation = async () => {
    if (!characterData) return;
  
    setIsSimulating(true);
    
    try {
      let input;
      
      if (inputMode === 'addon') {
        // Append combinations to the base input if available
        input = simcInput;
        if (combinations.length > 0) {
          input += formatCombinations();
        }
      } else {
        // Format armory input
        input = `armory=${characterData.region},${characterData.realm.name},${characterData.name}`;
      }
  
      console.log("Simulation input:", input);
      
      // Encode the input as base64
      const base64Input = btoa(input);

      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ simc_input: base64Input }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const htmlContent = await response.text();
      setSimulationResult(htmlContent);

      // Scroll to the results
      if (simulationResultRef.current) {
        simulationResultRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Failed to run simulation: ' + error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // Function to download the HTML report
  const downloadReport = () => {
    if (!simulationResult) return;

    const blob = new Blob([simulationResult], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${characterData?.name || 'character'}_sim_report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Check if we have all necessary data to run simulation
  const canSimulate = characterData && (
    (inputMode === 'addon' && simcInput) ||
    (inputMode === 'armory' && characterData.name && characterData.realm.name)
  );

  return (
    <div className="container mt-3 pb-5 mb-5">
      {simulationResult && (
        <div ref={simulationResultRef}>
          <CollapsibleSection title="Simulation Results">
            <SimulationReport htmlContent={simulationResult} height="500px" />
            <div className="d-flex justify-content-end mt-2">
              <button
                className="btn btn-secondary"
                onClick={downloadReport}
              >
                Download Report
              </button>
            </div>
          </CollapsibleSection>
        </div>
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
            setCharacterData(null);
            setItemsData(null);
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
            setCharacterData(null);
            setItemsData(null);
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

      <CharacterDisplay character={characterData} />

      {characterData && (
        <CollapsibleSection title="Character Equipment">
          <ItemSelect
            slots={preparedItems}
            onCombinationsGenerated={handleCombinationsGenerated}
          />
        </CollapsibleSection>
      )}

      {/* Sticky simulation button */}
      {canSimulate && (
        <div
          className="position-fixed bottom-0 start-0 w-100 bg-body py-3"
          style={{ zIndex: 1000 }}
        >
          <div className="container text-center">
            <button
              className="btn btn-primary"
              disabled={isSimulating}
              onClick={runSimulation}
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
      )}
    </div>
  );
}

export default Simc;