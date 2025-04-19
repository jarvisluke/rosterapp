`Simc.jsx`
```jsx
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import AddonInput from './AddonInput';
import ArmoryInput from './ArmoryInput';
import ItemSelect from './ItemSelect';
import fetchApi from '../../util/api';
import CollapsibleSection from './CollapsibleSection';
import CharacterDisplay from './CharacterDisplay';
import SimulationReport from './SimulationReport';
import CombinationsDisplay from './CombinationsDisplay';
import AdditionalOptions from './AdditionalOptions';

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
  const [simOptions, setSimOptions] = useState({
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
  });

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

  const handleOptionsChange = useCallback((newOptions) => {
    setSimOptions(newOptions);
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

  const formatItemForSimC = (slotKey, item) => {
    if (!item) return '';

    let output = `${slotKey}=,id=${item.id}`;

    // Add enchant if available
    if (item.enchant_id || item.enchant) {
      output += `,enchant_id=${item.enchant_id || item.enchant}`;
    }

    // Add gems if available
    if ((item.gems && item.gems.length > 0) || (item.gem_id && item.gem_id.length > 0)) {
      const gems = item.gems || item.gem_id || [];
      if (gems.length > 0 && gems[0]) {
        output += `,gem_id=${gems.join('/')}`;
      }
    }

    // Add bonus IDs if available
    if ((item.bonusIds && item.bonusIds.length > 0) || (item.bonus_list && item.bonus_list.length > 0) || (item.bonus_id && item.bonus_id.length > 0)) {
      const bonusList = item.bonusIds || item.bonus_list || item.bonus_id || [];
      if (bonusList.length > 0) {
        output += `,bonus_id=${bonusList.join('/')}`;
      }
    }

    // Add crafted stats if available
    if (item.crafted_stats && item.crafted_stats.length > 0) {
      output += `,crafted_stats=${item.crafted_stats.join('/')}`;
    }

    return output;
  };

  // Extract character info from original SimC input
  const extractCharacterInfo = () => {
    const charInfo = [];
    const lines = simcInput.split('\n');
    
    // Parse class from spec or other parameters
    let detectedClass = '';
    for (const line of lines) {
      if (line.startsWith('spec=')) {
        const spec = line.substring(5).toLowerCase();
        // Map specs to classes - extend this map for other classes
        const specClassMap = {
          subtlety: 'rogue',
          assassination: 'rogue',
          outlaw: 'rogue',
          // Add other specs here...
        };
        detectedClass = specClassMap[spec] || '';
        break;
      }
    }
    
    // Extract character name from comment line or use default
    let characterName = 'Character';
    const commentLine = lines.find(line => line.startsWith('#'));
    if (commentLine) {
      const match = commentLine.match(/^#\s*([^\s-]+)/);
      if (match && match[1]) {
        characterName = match[1];
      }
    }
    
    // Create proper character declaration
    if (detectedClass) {
      charInfo.push(`${detectedClass}="${characterName}"`);
    } else {
      // If we can't detect class, prompt user or try another method
      // For this example, we'll use 'rogue' since that's in the original example
      charInfo.push(`rogue="${characterName}"`);
    }

    // Extract important character settings
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
  };

  // Create an equipped gear combination from itemsData
  const createEquippedCombination = () => {
    if (!itemsData) return null;

    const equippedGear = {};

    Object.entries(itemsData).forEach(([slotKey, data]) => {
      if (!skippedSlots.includes(slotKey) && data.equipped) {
        if (slotKey === 'rings') {
          // Handle special case for rings
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
  };

  // Add simulation options to the input
  const addSimulationOptions = (inputText) => {
    let options = [];
    
    // Add max fight duration
    options.push(`max_time=${simOptions.fightDuration}`);
    
    // Add raid buff settings
    if (!simOptions.optimalRaidBuffs) {
      options.push('optimal_raid=0');
      
      // Ad individual buff overrides
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
    
    // Add Power Infusion setting regardless of optimal_raid
    options.push(`external_buffs.power_infusion=${simOptions.powerInfusion ? 1 : 0}`);
    
    // Append options to the input
    return `${inputText}\n\n# Simulation Options\n${options.join('\n')}`;
  };

  const formatCombinations = () => {
    if (!combinations.length) return '';

    let combinationsText = '';
    const characterInfo = extractCharacterInfo();

    // Start with base profile (character declaration + settings)
    combinationsText += `${characterInfo}\n\n`;

    // Add equipped gear as "Equipped" profile
    const equippedGear = createEquippedCombination();
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

    // Add other combinations
    combinations.forEach((combo, index) => {
      const comboNumber = index + 1;
      combinationsText += `copy="Combo ${comboNumber}"\n`;
      combinationsText += `### Gear Combination ${comboNumber}\n`;

      // Add each item in the combination
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

    // Add simulation options
    combinationsText = addSimulationOptions(combinationsText);

    return combinationsText;
  };

  const runSimulation = async () => {
    if (!characterData) return;

    setIsSimulating(true);

    try {
      let input;

      if (inputMode === 'addon') {
        if (combinations.length > 0) {
          // Create a new SimC input that only includes necessary info + combinations
          input = formatCombinations();
        } else {
          // For original input without combinations, we still need to format it properly
          const lines = simcInput.split('\n').filter(line => !line.startsWith('Simulation input:'));
          const characterInfo = extractCharacterInfo();
          
          // Remove character settings from the rest of the input
          const remainingLines = lines.filter(line => {
            if (line.startsWith('#') || line.startsWith('//')) return true;
            if (['level=', 'race=', 'region=', 'server=', 'role=', 'professions=', 
                'spec=', 'talents=', 'covenant=', 'soulbind='].some(s => line.startsWith(s))) {
              return false;
            }
            return true;
          });
          
          input = characterInfo + '\n\n' + remainingLines.join('\n');
          input = addSimulationOptions(input);
        }
      } else {
        // Format armory input with simulation options
        input = `armory=${characterData.region},${characterData.realm.name},${characterData.name}`;
        input = addSimulationOptions(input);
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

      {characterData && (
        <CollapsibleSection title="Additional Options">
          <AdditionalOptions 
            options={simOptions}
            onChange={handleOptionsChange}
          />
        </CollapsibleSection>
      )}

      {characterData && (
        <CollapsibleSection title="Simulation Setup" defaultOpen={true}>
          <CombinationsDisplay
            combinations={combinations}
            characterData={characterData}
            itemsData={itemsData}
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
```

