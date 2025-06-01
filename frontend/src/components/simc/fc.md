`Simc.jsx`
```jsx
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
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
import { ConstraintValidator } from './ClassConstraints';
import { SimcParser } from './SimcParser';

// Isolated EquipmentSection component
const EquipmentSection = memo(({ itemsData, onCombinationsGenerated, characterInfo = null }) => {
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

  const preparedItems = useMemo(() => {
    if (!itemsData) return [];

    return Object.entries(itemsData)
      .filter(([slotKey, _]) => !skippedSlots.includes(slotKey))
      .map(([slotKey, data]) => {
        const items = [data.equipped, ...(data.alternatives || [])].filter(Boolean);
        
        // Apply constraints if we have character info
        let validatedItems = items;
        if (characterInfo?.class && characterInfo?.spec) {
          validatedItems = items.map(item => ({
            ...item,
            constraints: validateItemConstraints(item, slotKey, characterInfo)
          }));
        }

        return {
          name: slotDisplayNames[slotKey] || slotKey.charAt(0).toUpperCase() + slotKey.slice(1).replace('_', ' '),
          slotKey: slotKey,
          equipped: data.equipped,
          alternatives: data.alternatives || [],
          validatedItems: validatedItems
        };
      });
  }, [itemsData, characterInfo]);

  return (
    <CollapsibleSection title="Character Equipment">
      <ItemSelect
        slots={preparedItems}
        onCombinationsGenerated={onCombinationsGenerated}
        characterInfo={characterInfo}
      />
    </CollapsibleSection>
  );
});

// Helper function to validate item constraints
const validateItemConstraints = (item, slotKey, characterInfo) => {
  const constraints = {
    armor: { valid: true, constraint: 'none' },
    weapon: { valid: true, constraint: 'none' },
    stat: { valid: true, constraint: 'none' }
  };

  if (!item || !characterInfo?.class || !characterInfo?.spec) {
    return constraints;
  }

  // Validate armor type for armor pieces
  if (item.armorType && ['head', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet'].includes(slotKey)) {
    constraints.armor = ConstraintValidator.isArmorTypeValid(
      characterInfo.class, 
      characterInfo.spec, 
      item.armorType
    );
  }

  // Validate weapon type for weapon slots
  if (item.weaponType && ['main_hand', 'off_hand'].includes(slotKey)) {
    constraints.weapon = ConstraintValidator.isWeaponTypeValid(
      characterInfo.class,
      characterInfo.spec,
      item.weaponType,
      slotKey
    );
  }

  // Validate primary stat
  if (item.primaryStat) {
    constraints.stat = ConstraintValidator.isPrimaryStatValid(
      characterInfo.class,
      characterInfo.spec,
      item.primaryStat
    );
  }

  return constraints;
};

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

function Simc() {
  // Core state
  const [inputMode, setInputMode] = useState('addon');
  const [characterData, setCharacterData] = useState(null);
  const [itemsData, setItemsData] = useState(null);
  const [simcInput, setSimcInput] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [realmIndex, setRealmIndex] = useState(null);
  const [isLoadingRealms, setIsLoadingRealms] = useState(true);
  const [characterInfo, setCharacterInfo] = useState(null);

  // Refs for data that doesn't affect rendering
  const combinationsRef = useRef([]);
  const simOptionsRef = useRef({
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
  });

  const simulationDataRef = useRef({
    formatItemForSimC: (slotKey, item) => {
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
    },
    createEquippedCombination: (itemsData) => {
      if (!itemsData) return null;
      const skippedSlots = ['tabard', 'shirt'];
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
    },
    pairedSlots: {
      main_hand: 'off_hand',
      off_hand: 'main_hand',
      finger1: 'finger2',
      finger2: 'finger1',
      trinket1: 'trinket2',
      trinket2: 'trinket1'
    }
  });

  const resultsRef = useRef(null);

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

  // Extract character info when simc input changes
  useEffect(() => {
    if (simcInput && inputMode === 'addon') {
      try {
        const extractedInfo = SimcParser.extractCharacterInfo(simcInput);
        const validation = SimcParser.validateCharacterInfo(extractedInfo);
        
        if (validation.valid) {
          setCharacterInfo(extractedInfo);
        } else {
          console.warn('Invalid character info:', validation.error);
          setCharacterInfo(null);
        }
      } catch (error) {
        console.error('Error parsing character info:', error);
        setCharacterInfo(null);
      }
    } else if (inputMode === 'armory' && characterData) {
      // For armory mode, try to extract info from characterData
      const extractedInfo = {
        class: characterData.character_class?.toLowerCase(),
        spec: characterData.active_spec?.toLowerCase(),
        name: characterData.name,
        level: characterData.level,
        race: characterData.race?.toLowerCase(),
        region: characterData.region,
        server: characterData.realm?.name
      };
      
      const validation = SimcParser.validateCharacterInfo(extractedInfo);
      if (validation.valid) {
        setCharacterInfo(extractedInfo);
      }
    }
  }, [simcInput, inputMode, characterData]);

  const handleDataUpdate = useCallback((data) => {
    if (data) {
      setCharacterData(data.character);
      setItemsData(data.items);
      if (inputMode === 'addon') {
        setSimcInput(data.rawInput);
      }
    } else {
      setCharacterData(null);
      setItemsData(null);
      setSimcInput('');
    }
  }, [inputMode]);

  const handleCombinationsUpdate = useCallback((newCombinations) => {
    combinationsRef.current = newCombinations;
  }, []);

  const addSimulationOptions = useCallback((inputText) => {
    const options = simOptionsRef.current;
    let optionsArr = [];

    // General options
    optionsArr.push(`max_time=${options.general.fightDuration.value}`);

    // Handle buffs based on optimalRaidBuffs setting
    if (!options.general.optimalRaidBuffs.value) {
      optionsArr.push('optimal_raid=0');

      // Add all override buffs (raid buffs)
      Object.entries(options.buffs).forEach(([id, buff]) => {
        if (buff.category === 'override') {
          const simcKey = id.replace(/([A-Z])/g, '_$1').toLowerCase();
          optionsArr.push(`${buff.category}.${simcKey}=${buff.value ? 1 : 0}`);
        }
      });
    }

    // Add external buffs (always included)
    Object.entries(options.buffs).forEach(([id, buff]) => {
      if (buff.category === 'external_buffs') {
        const simcKey = id.replace(/([A-Z])/g, '_$1').toLowerCase();
        optionsArr.push(`${buff.category}.${simcKey}=${buff.value ? 1 : 0}`);
      }
    });

    return `${inputText}\n\n# Simulation Options\n${optionsArr.join('\n')}`;
  }, []);

  const handleOptionsChange = useCallback((newOptions) => {
    simOptionsRef.current = newOptions;
  }, []);

  const formatCombinations = useCallback(() => {
    const combinations = combinationsRef.current;
    if (!combinations.length) return '';

    const { createEquippedCombination, formatItemForSimC } = simulationDataRef.current;

    let combinationsText = '';
    
    // Use SimcParser to extract character info
    const characterInfoString = characterInfo ? 
      SimcParser.createCharacterInfoString(characterInfo) :
      SimcParser.extractCharacterInfo(simcInput);

    combinationsText += `${characterInfoString}\n\n`;

    // Extract talents and other settings from original input
    const lines = simcInput.split('\n');
    const additionalSettings = lines.filter(line => {
      if (line.startsWith('#') || line.startsWith('//')) return true;
      if (line.startsWith('talents=') || line.startsWith('professions=')) return true;
      return false;
    });

    if (additionalSettings.length > 0) {
      combinationsText += additionalSettings.join('\n') + '\n\n';
    }

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

        // Validate item constraints and add warnings
        if (characterInfo) {
          const constraints = validateItemConstraints(item, slotKey, characterInfo);
          const warnings = [];
          
          if (!constraints.armor.valid) {
            warnings.push('Invalid armor type');
          } else if (constraints.armor.constraint === 'soft') {
            warnings.push('Suboptimal armor type');
          }
          
          if (!constraints.weapon.valid) {
            warnings.push('Invalid weapon type');
          } else if (constraints.weapon.constraint === 'soft') {
            warnings.push('Suboptimal weapon type');
          }
          
          if (constraints.stat.constraint === 'soft') {
            warnings.push('Suboptimal primary stat');
          }
          
          if (warnings.length > 0) {
            combinationsText += `# Warning: ${warnings.join(', ')}\n`;
          }
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

        // Validate item constraints for combinations too
        if (characterInfo) {
          const constraints = validateItemConstraints(item, slotKey, characterInfo);
          const warnings = [];
          
          if (!constraints.armor.valid) {
            warnings.push('Invalid armor type');
          } else if (constraints.armor.constraint === 'soft') {
            warnings.push('Suboptimal armor type');
          }
          
          if (!constraints.weapon.valid) {
            warnings.push('Invalid weapon type');
          } else if (constraints.weapon.constraint === 'soft') {
            warnings.push('Suboptimal weapon type');
          }
          
          if (constraints.stat.constraint === 'soft') {
            warnings.push('Suboptimal primary stat');
          }
          
          if (warnings.length > 0) {
            combinationsText += `# Warning: ${warnings.join(', ')}\n`;
          }
        }

        combinationsText += `${formatItemForSimC(slotKey, item)}\n`;
      });

      combinationsText += '\n';
    });

    return addSimulationOptions(combinationsText);
  }, [simcInput, itemsData, characterInfo, addSimulationOptions]);

  const canSimulate = useMemo(() => {
    return characterData && (
      (inputMode === 'addon' && simcInput) ||
      (inputMode === 'armory' && characterData.name && characterData.realm?.name)
    );
  }, [characterData, inputMode, simcInput]);

  const runSimulation = useCallback(async () => {
    if (!characterData) return;

    setIsSimulating(true);

    try {
      let input;

      if (inputMode === 'addon') {
        if (combinationsRef.current.length > 0) {
          input = formatCombinations();
        } else {
          const lines = simcInput.split('\n').filter(line => !line.startsWith('Simulation input:'));
          const characterInfoString = characterInfo ? 
            SimcParser.createCharacterInfoString(characterInfo) :
            SimcParser.extractCharacterInfo(simcInput);

          const remainingLines = lines.filter(line => {
            if (line.startsWith('#') || line.startsWith('//')) return true;
            if (['level=', 'race=', 'region=', 'server=', 'role=', 'professions=',
              'spec=', 'talents=', 'covenant=', 'soulbind='].some(s => line.startsWith(s))) {
              return false;
            }
            return true;
          });

          input = characterInfoString + '\n\n' + remainingLines.join('\n');
          input = addSimulationOptions(input);
        }
      } else {
        input = `armory=${characterData.region},${characterData.realm.name},${characterData.name}`;
        input = addSimulationOptions(input);
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
      setIsSimulating(false);
    }
  }, [characterData, inputMode, simcInput, characterInfo, formatCombinations, addSimulationOptions]);

  const downloadReport = useCallback(() => {
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
  }, [simulationResult, characterData]);

  const scrollToResults = useCallback(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleSimulationComplete = useCallback((result) => {
    if (result) {
      setSimulationResult(result);
      // Add small delay to ensure the results are rendered before scrolling
      setTimeout(() => scrollToResults(), 100);
    }
    setCurrentJobId(null);
    setIsSimulating(false);
  }, [scrollToResults]);

  const handleSimulationClose = useCallback(() => {
    setCurrentJobId(null);
    setIsSimulating(false);
  }, []);

  const resetState = useCallback(() => {
    setCharacterData(null);
    setItemsData(null);
    setSimcInput('');
    setCharacterInfo(null);
    combinationsRef.current = [];
  }, []);

  return (
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
          result={simulationResult}
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
            resetState();
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
            resetState();
          }}
        />
        <label className="btn btn-outline-primary" htmlFor="armory_radio">Armory</label>
      </div>

      {inputMode === 'addon' ? (
        <AddonInput
          onDataUpdate={handleDataUpdate}
          pairedSlots={simulationDataRef.current.pairedSlots}
          skippedSlots={['tabard', 'shirt']}
        />
      ) : (
        <ArmoryInput
          onDataUpdate={handleDataUpdate}
          pairedSlots={simulationDataRef.current.pairedSlots}
          skippedSlots={['tabard', 'shirt']}
          realmIndex={realmIndex}
          isLoadingRealms={isLoadingRealms}
        />
      )}

      <CharacterDisplay character={characterData} characterInfo={characterInfo} />

      {characterData && (
        <EquipmentSection
          itemsData={itemsData}
          onCombinationsGenerated={handleCombinationsUpdate}
          characterInfo={characterInfo}
        />
      )}

      {characterData && (
        <CollapsibleSection title="Additional Options">
          <AdditionalOptions
            options={simOptionsRef.current}
            onChange={handleOptionsChange}
          />
        </CollapsibleSection>
      )}

      {characterData && (
        <CollapsibleSection title="Simulation Setup" defaultOpen={true}>
          <CombinationsDisplay
            combinations={combinationsRef.current}
            characterData={characterData}
            itemsData={itemsData}
            characterInfo={characterInfo}
            onCombinationsChange={handleCombinationsUpdate}
          />
        </CollapsibleSection>
      )}

      <SimulationButton
        canSimulate={canSimulate}
        isSimulating={isSimulating}
        onRun={runSimulation}
      />
    </div>
  );
}

export default Simc;
```

`AddonInput.jsx`
```jsx
import { useState, useEffect } from 'react';

const AddonInput = ({ onDataUpdate, pairedSlots, skippedSlots }) => {
  const [simcInput, setSimcInput] = useState('');
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSimcInput(newValue);
    setError(null);

    if (newValue.trim()) {
      try {
        const parsedData = parseSimC(newValue);
        onDataUpdate({
          ...parsedData,
          rawInput: newValue  // Pass the raw input along with parsed data
        });
      } catch (err) {
        setError(err.message);
        onDataUpdate(null);
      }
    } else {
      onDataUpdate(null);
    }
  };

  // Adler-32 checksum implementation matching the Lua version
  const adler32 = (data) => {
    const MOD_ADLER = 65521; // largest prime smaller than 2^16
    let s1 = 1;
    let s2 = 0;

    // Process each character
    for (let i = 0; i < data.length; i++) {
      s1 = (s1 + data.charCodeAt(i)) % MOD_ADLER;
      s2 = (s2 + s1) % MOD_ADLER;
    }

    // Combine s1 and s2 using bitwise operations
    return ((s2 << 16) | s1) >>> 0;
  };

  const parseSimC = (input) => {
    try {
      // Find the index of the checksum line
      const checksumLineIndex = input.lastIndexOf('# Checksum:');
      if (checksumLineIndex === -1) {
        throw new Error('No checksum found in SimC input');
      }

      // Extract the provided checksum
      const checksumMatch = input.substring(checksumLineIndex).match(/# Checksum: ([a-fA-F0-9]+)/);
      if (!checksumMatch) {
        throw new Error('Malformed checksum in SimC input');
      }

      // Get only the data before the checksum line for calculation
      const inputForChecksum = input.substring(0, checksumLineIndex);

      // Get the first line for character info
      const lines = input.split('\n');
      const firstLine = lines[0] || '';

      // Parse character name and realm from the first line
      let characterName = 'Unknown';
      let displayRealm = 'Unknown';
      let spec = '';

      // First line pattern: # Character_Name - Spec_Name - Date - Region/Realm
      const firstLineMatch = firstLine.match(/# ([^-]+) - ([^-]+) - [^-]+ - [^\/]+\/([^"]+)/);

      if (firstLineMatch) {
        characterName = firstLineMatch[1].trim();
        spec = firstLineMatch[2].trim();
        displayRealm = firstLineMatch[3].trim();
      } else {
        // Fallback to finding realm only if full pattern doesn't match
        const realmMatch = firstLine.match(/\/([^\/\n]+)$/);
        if (realmMatch) {
          displayRealm = realmMatch[1].trim();
        }
      }

      // Calculate checksum
      const calculatedChecksum = adler32(inputForChecksum);
      const providedChecksum = parseInt(checksumMatch[1], 16);

      if (calculatedChecksum !== providedChecksum) {
        throw new Error('Invalid SimC input: checksum mismatch');
      }

      // Use parsed name from first line, or fall back to the rogue="..." pattern
      const name = characterName !== 'Unknown' ? characterName : (input.match(/rogue="([^"]+)"/)?.[1] || 'Unknown');

      // If we parsed spec from first line, use it, otherwise look for spec= pattern
      let parsedSpec = spec || input.match(/spec=([a-z]+)/)?.[1];
      if (!parsedSpec) parsedSpec = 'subtlety'; // Default to Subtlety if no spec found

      // Parse other character info
      const level = input.match(/level=(\d+)/)?.[1];
      const race = input.match(/race=([a-z]+)/)?.[1];
      const region = input.match(/region=([a-z]+)/)?.[1];
      const server = input.match(/server=([a-z]+)/)?.[1];
      let specId = '261'; // Default to Subtlety

      if (parsedSpec) {
        switch (parsedSpec.toLowerCase()) {
          case 'assassination': specId = '259'; break;
          case 'outlaw': specId = '260'; break;
          case 'subtlety': specId = '261'; break;
        }
      }

      // Extract item information with names
      const items = {};
      let currentItemName = '';
      let isGearFromBags = false;

      // Special handling for rings - combine into a single 'rings' slot
      const ringItems = {
        equipped: [],
        alternatives: []
      };

      for (const line of lines) {
        if (line.startsWith('### Gear from Bags')) {
          isGearFromBags = true;
          continue;
        }

        if (line.startsWith('### Additional Character Info')) {
          isGearFromBags = false;
          continue;
        }

        if (line.startsWith('# ') && line.match(/\(\d+\)$/)) {
          // Extract item name and item level from comment line
          const itemLevelMatch = line.match(/\((\d+)\)$/);
          currentItemName = line.substring(2, line.lastIndexOf(' ('));
          const itemLevel = itemLevelMatch ? itemLevelMatch[1] : null;

          // Extract item information
          const nextLine = lines[lines.indexOf(line) + 1];
          if (nextLine && nextLine.match(/^#?\s*[\w_]+=,id=/)) {
            const itemMatch = nextLine.match(/^#?\s*([\w_]+)=,id=(\d+)(?:,enchant_id=(\d+))?(?:,gem_id=([^,]+))?(?:,bonus_id=([^,]+))?/);
            if (itemMatch) {
              const [_, slot, itemId, enchantId, gemIds, bonusIds] = itemMatch;

              // Skip specified slots (e.g. tabard)
              if (skippedSlots.includes(slot)) continue;

              const itemData = {
                id: itemId,
                name: currentItemName,
                enchant: enchantId || null,
                gems: gemIds ? gemIds.split('/') : [],
                bonusIds: bonusIds ? bonusIds.split('/') : [],
                itemLevel: itemLevel
              };

              // Handle ring slots separately
              if (slot === 'finger1' || slot === 'finger2') {
                if (!isGearFromBags) {
                  // Add to equipped rings if not already there
                  if (!ringItems.equipped.some(ring => ring.id === itemId)) {
                    ringItems.equipped.push(itemData);
                  }
                } else {
                  // Add to alternatives if not already there and not equipped
                  const isEquipped = ringItems.equipped.some(ring => ring.id === itemId);
                  const isAlreadyAlternative = ringItems.alternatives.some(ring => ring.id === itemId);
                  
                  if (!isEquipped && !isAlreadyAlternative) {
                    ringItems.alternatives.push(itemData);
                  }
                }
              } else {
                // Handle normal slots
                if (!items[slot]) {
                  items[slot] = {
                    equipped: null,
                    alternatives: []
                  };
                }

                if (isGearFromBags) {
                  // Add to alternatives but avoid duplicates
                  const isDuplicate = items[slot].alternatives.some(item => item.id === itemId) ||
                    (items[slot].equipped && items[slot].equipped.id === itemId);

                  if (!isDuplicate) {
                    items[slot].alternatives.push(itemData);
                  }
                } else {
                  items[slot].equipped = itemData;
                }
              }
            }
          }
        }
      }

      // Add the combined rings to the items object
      items.rings = ringItems;

      return {
        character: {
          name,
          level,
          race: { name: race },
          realm: { name: server, displayName: displayRealm },
          region,
          character_class: { name: 'Rogue' },
          spec: parsedSpec,
          specId
        },
        items
      };
    } catch (err) {
      throw err;
    }
  };

  return (
    <>
      <textarea
        className={`form-control bg-body-secondary font-monospace ${error ? 'is-invalid' : ''}`}
        placeholder="Paste the output from the /simc command here..."
        style={{ height: '200px' }}
        value={simcInput}
        onChange={handleInputChange}
      />
      <div className="invalid-feedback">
        {error}
      </div>
    </>
  );
};

export default AddonInput;
```

`CharacterDisplay.jsx`
```jsx
const CharacterDisplay = ({ character }) => {
    return character ? (
        <div className="card mt-3 mb-3">
            <div className="card-body">
                <h5 className="card-title">
                    {character.name}
                    {character.realm?.displayName &&
                        <span className="text-muted">-{character.realm.displayName}</span>}
                </h5>
                <p className="card-text">
                    Level {character.level}{' '}
                    {character.race.name.charAt(0).toUpperCase() +
                        character.race.name.slice(1)}{' '}
                    {character.character_class.name}
                    {character.spec && ` (${character.spec.charAt(0).toUpperCase() +
                        character.spec.slice(1)
                        })`}
                </p>
            </div>
        </div>
    ) : null;
};

export default CharacterDisplay
```

`ItemSelect.jsx`
```jsx
import { useEffect, useState, useRef } from 'react';
import ItemSlot from './ItemSlot';
import Item from './Item';

const ItemSelect = ({ slots, onCombinationsGenerated }) => {
  const [selectedItems, setSelectedItems] = useState({});
  const [lastLoggedCombinations, setLastLoggedCombinations] = useState(null);
  const combinationCallbackRef = useRef(onCombinationsGenerated);

  // Shared slot types - items can be equipped in any of these slots
  const sharedTypes = {
    trinket: ['trinket1', 'trinket2'],
    weapon: ['main_hand', 'off_hand']
  };

  // Keep callback reference fresh
  useEffect(() => {
    combinationCallbackRef.current = onCombinationsGenerated;
  }, [onCombinationsGenerated]);

  // Get all items for a specific type (trinkets or weapons)
  const getItemsForType = (type, currentSlotKey) => {
    if (!slots) return [];
    const sharedSlotKeys = sharedTypes[type];
    if (!sharedSlotKeys) return [];

    const items = [];
    const itemIds = new Set(); // Track unique items

    // First, find the equipped item for the current slot
    const currentSlot = slots.find(s => s.slotKey === currentSlotKey);
    if (currentSlot && currentSlot.equipped) {
      items.push({
        ...currentSlot.equipped,
        equippedIn: currentSlotKey
      });
      itemIds.add(currentSlot.equipped.id);
    }

    // Then add equipped items from other slots
    sharedSlotKeys.forEach(slotKey => {
      if (slotKey === currentSlotKey) return; // Skip current slot (already added)
      
      const slotData = slots.find(s => s.slotKey === slotKey);
      if (!slotData) return;

      // Add equipped item from other slots
      if (slotData.equipped && !itemIds.has(slotData.equipped.id)) {
        items.push({
          ...slotData.equipped,
          equippedIn: slotKey
        });
        itemIds.add(slotData.equipped.id);
      }
    });

    // Finally, add all alternatives
    sharedSlotKeys.forEach(slotKey => {
      const slotData = slots.find(s => s.slotKey === slotKey);
      if (!slotData || !slotData.alternatives) return;

      slotData.alternatives.forEach(alt => {
        if (!itemIds.has(alt.id)) {
          items.push({
            ...alt,
            equippedIn: null
          });
          itemIds.add(alt.id);
        }
      });
    });

    return items;
  };

  // Initialize with equipped items selected when slots change
  useEffect(() => {
    if (!slots || slots.length === 0) return;

    const initialSelected = {};
    slots.forEach(slot => {
      // For ring slots (special case)
      if (slot.slotKey === 'rings' && slot.equipped && Array.isArray(slot.equipped)) {
        initialSelected['rings'] = slot.equipped.map(ring => ({
          id: ring.id,
          item: ring
        }));
      }
      // For regular equipped items
      else if (slot.equipped) {
        initialSelected[slot.slotKey] = [{
          id: slot.equipped.id,
          item: slot.equipped
        }];
      }
    });

    setSelectedItems(initialSelected);
  }, [slots]);

  // Generate combinations whenever selected items change
  useEffect(() => {
    const combinations = generateCombinations();
    combinationCallbackRef.current(combinations);

    // Only log if combinations actually changed
    const combinationsString = JSON.stringify(combinations);
    if (combinationsString !== lastLoggedCombinations) {
      console.log(`Generated ${combinations.length} combinations`);
      setLastLoggedCombinations(combinationsString);
    }
  }, [selectedItems]);

  // Toggle item selection
  const handleItemToggle = (slotKey, itemId, item, isSelected) => {
    setSelectedItems(prev => {
      const newSelected = { ...prev };
      
      // Initialize slot if needed
      if (!newSelected[slotKey]) {
        newSelected[slotKey] = [];
      }

      if (isSelected) {
        // Add item if not already present
        if (!newSelected[slotKey].some(i => i.id === itemId)) {
          newSelected[slotKey] = [...newSelected[slotKey], { id: itemId, item }];
        }
      } else {
        // Remove item
        newSelected[slotKey] = newSelected[slotKey].filter(i => i.id !== itemId);
      }

      return newSelected;
    });
  };

  // Check if item violates unique constraints within a combination
  const violatesUniqueConstraints = (combination) => {
    const uniqueItems = new Set();
    const categoryCount = {};
    const usedItemIds = new Set(); // Track overall item usage

    // Check all items in the combination
    for (const [slotKey, item] of Object.entries(combination)) {
      if (!item) continue;

      // Don't allow the same item in multiple slots
      if (usedItemIds.has(item.id)) {
        return true;
      }
      usedItemIds.add(item.id);

      // For unique-equipped items
      if (item.unique_equipped || (item.flags && item.flags.includes('unique-equipped'))) {
        if (uniqueItems.has(item.id)) {
          return true; // Duplicate unique item
        }
        uniqueItems.add(item.id);
      }

      // For unique-equipped categories (like embellished items)
      if (item.unique_equipped_category) {
        const category = item.unique_equipped_category;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
        
        const limit = item.unique_equipped_limit || 1;
        if (categoryCount[category] > limit) {
          return true; // Category limit exceeded
        }
      }
    }

    return false;
  };

  // Generate all valid combinations from selected items
  const generateCombinations = () => {
    const slots = Object.keys(selectedItems).filter(key => key !== 'rings');
    
    // Handle ring combinations separately
    const ringCombinations = [];
    const selectedRings = selectedItems['rings'] || [];
    
    if (selectedRings.length >= 2) {
      for (let i = 0; i < selectedRings.length; i++) {
        for (let j = i + 1; j < selectedRings.length; j++) {
          ringCombinations.push({
            finger1: selectedRings[i].item,
            finger2: selectedRings[j].item
          });
        }
      }
    }

    // If no rings, can't generate valid combinations
    if (ringCombinations.length === 0) return [];

    // Generate non-ring combinations
    const generateForSlot = (index, current) => {
      // Base case: all slots processed
      if (index === slots.length) {
        // Add each ring combination to the current combination
        return ringCombinations.map(ringCombo => ({
          ...current,
          ...ringCombo
        }));
      }

      const slotKey = slots[index];
      const items = selectedItems[slotKey] || [];
      const results = [];

      // Generate for each item in current slot
      for (const { item } of items) {
        const newCurrent = { ...current, [slotKey]: item };
        results.push(...generateForSlot(index + 1, newCurrent));
      }

      return results;
    };

    // Generate all possible combinations
    const allCombinations = generateForSlot(0, {});
    
    // Filter out combinations that violate unique constraints
    return allCombinations.filter(combo => !violatesUniqueConstraints(combo));
  };

  // Render the item selection interface
  if (!slots || slots.length === 0) return null;

  return (
    <div className="row row-cols-1 row-cols-md-3 g-3 justify-content-center">
      {slots.map(slot => {
        // Special case for rings
        if (slot.slotKey === 'rings') {
          return (
            <div className="col" key="rings">
              <div className="card">
                <div className="card-header bg-dark-subtle text-muted">
                  <strong>Rings</strong>
                </div>
                <div className="list-group list-group-flush">
                  {slot.equipped && Array.isArray(slot.equipped) && slot.equipped.map((ring, idx) => (
                    <div className="list-group-item" key={`equipped-ring-${idx}`}>
                      <Item
                        item={ring}
                        slotKey="rings"
                        defaultChecked={true}
                        onToggle={(isChecked) => handleItemToggle('rings', ring.id, ring, isChecked)}
                        isSelected={(selectedItems['rings'] || []).some(item => item.id === ring.id)}
                      />
                    </div>
                  ))}
                  {slot.alternatives.map((ring, idx) => (
                    <div className="list-group-item list-group-item-secondary" key={`alt-ring-${idx}`}>
                      <Item
                        item={ring}
                        slotKey="rings"
                        defaultChecked={false}
                        onToggle={(isChecked) => handleItemToggle('rings', ring.id, ring, isChecked)}
                        isSelected={(selectedItems['rings'] || []).some(item => item.id === ring.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {selectedItems['rings'] && selectedItems['rings'].length < 2 && (
                <div className="alert alert-warning mt-2">
                  Please select at least 2 rings
                </div>
              )}
            </div>
          );
        }
        
        // Handle trinket slots - show ALL trinkets, current equipped first
        if (slot.slotKey === 'trinket1' || slot.slotKey === 'trinket2') {
          const allTrinkets = getItemsForType('trinket', slot.slotKey);
          
          return (
            <div className="col" key={slot.slotKey}>
              <div className="card">
                <div className="card-header bg-dark-subtle text-muted">
                  <strong>{slot.name}</strong>
                </div>
                <div className="list-group list-group-flush">
                  {allTrinkets.map((trinket, idx) => {
                    const isEquippedHere = trinket.equippedIn === slot.slotKey;
                    const className = isEquippedHere ? "list-group-item" : "list-group-item list-group-item-secondary";
                    
                    return (
                      <div className={className} key={`${slot.slotKey}-trinket-${idx}`}>
                        <Item
                          item={trinket}
                          slotKey={slot.slotKey}
                          defaultChecked={isEquippedHere}
                          onToggle={(isChecked) => handleItemToggle(slot.slotKey, trinket.id, trinket, isChecked)}
                          isSelected={(selectedItems[slot.slotKey] || []).some(item => item.id === trinket.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }
        
        // Handle weapon slots - show ALL weapons, current equipped first
        if (slot.slotKey === 'main_hand' || slot.slotKey === 'off_hand') {
          const allWeapons = getItemsForType('weapon', slot.slotKey);
          
          return (
            <div className="col" key={slot.slotKey}>
              <div className="card">
                <div className="card-header bg-dark-subtle text-muted">
                  <strong>{slot.name}</strong>
                </div>
                <div className="list-group list-group-flush">
                  {allWeapons.map((weapon, idx) => {
                    const isEquippedHere = weapon.equippedIn === slot.slotKey;
                    const className = isEquippedHere ? "list-group-item" : "list-group-item list-group-item-secondary";
                    
                    return (
                      <div className={className} key={`${slot.slotKey}-weapon-${idx}`}>
                        <Item
                          item={weapon}
                          slotKey={slot.slotKey}
                          defaultChecked={isEquippedHere}
                          onToggle={(isChecked) => handleItemToggle(slot.slotKey, weapon.id, weapon, isChecked)}
                          isSelected={(selectedItems[slot.slotKey] || []).some(item => item.id === weapon.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }
        
        // Regular slots
        return (
          <div className="col" key={slot.slotKey}>
            <ItemSlot
              {...slot}
              onItemToggle={(itemId, item, isSelected) =>
                handleItemToggle(slot.slotKey, itemId, item, isSelected)
              }
              selectedItems={selectedItems[slot.slotKey] || []}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ItemSelect;
```

`SimcParser.js`
```js
import { ConstraintValidator } from './ClassConstraints';

export class SimcParser {
  // Extract class and spec from SimC input
  static extractCharacterInfo(simcInput) {
    const lines = simcInput.split('\n');
    let characterInfo = {
      class: null,
      spec: null,
      name: 'Character',
      level: null,
      race: null,
      region: null,
      server: null
    };

    // Extract character name from comment
    const commentLine = lines.find(line => line.startsWith('#'));
    if (commentLine) {
      const match = commentLine.match(/^#\s*([^\s-]+)/);
      if (match && match[1]) {
        characterInfo.name = match[1];
      }
    }

    // Extract other character information
    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('//')) continue;

      if (line.startsWith('spec=')) {
        characterInfo.spec = line.substring(5).toLowerCase();
        
        // Determine class from spec
        characterInfo.class = SimcParser.getClassFromSpec(characterInfo.spec);
      } else if (line.startsWith('level=')) {
        characterInfo.level = parseInt(line.substring(6));
      } else if (line.startsWith('race=')) {
        characterInfo.race = line.substring(5);
      } else if (line.startsWith('region=')) {
        characterInfo.region = line.substring(7);
      } else if (line.startsWith('server=')) {
        characterInfo.server = line.substring(7);
      }

      // Also check for direct class definitions (like "rogue=CharacterName")
      const classMatch = line.match(/^([a-z_]+)="?([^"]+)"?$/);
      if (classMatch) {
        const possibleClass = classMatch[1].toLowerCase();
        if (ConstraintValidator.getClassConstraints(possibleClass)) {
          characterInfo.class = possibleClass;
          characterInfo.name = classMatch[2];
        }
      }
    }

    return characterInfo;
  }

  // Map specs to their respective classes
  static getClassFromSpec(specName) {
    const specClassMap = {
      // Warrior
      'arms': 'warrior',
      'fury': 'warrior',
      'protection': 'warrior',
      
      // Paladin
      'holy': 'paladin', // Note: Both paladin and priest have holy
      'retribution': 'paladin',
      // 'protection': 'paladin', // Same name as warrior, handled by context
      
      // Hunter
      'beast_mastery': 'hunter',
      'marksmanship': 'hunter',
      'survival': 'hunter',
      
      // Rogue
      'assassination': 'rogue',
      'outlaw': 'rogue',
      'subtlety': 'rogue',
      
      // Priest (holy conflicts with paladin, needs context)
      'discipline': 'priest',
      'shadow': 'priest',
      
      // Death Knight
      'blood': 'death_knight',
      'frost': 'death_knight', // Note: Also shaman, needs context
      'unholy': 'death_knight',
      
      // Shaman (frost conflicts with death knight)
      'elemental': 'shaman',
      'enhancement': 'shaman',
      'restoration': 'shaman', // Note: Also druid, needs context
      
      // Mage
      'arcane': 'mage',
      'fire': 'mage',
      // 'frost': 'mage', // Conflicts with death knight and shaman
      
      // Warlock
      'affliction': 'warlock',
      'demonology': 'warlock',
      'destruction': 'warlock',
      
      // Monk
      'brewmaster': 'monk',
      'mistweaver': 'monk',
      'windwalker': 'monk',
      
      // Druid (restoration conflicts with shaman)
      'balance': 'druid',
      'feral': 'druid',
      'guardian': 'druid',
      
      // Demon Hunter
      'havoc': 'demon_hunter',
      'vengeance': 'demon_hunter',
      
      // Evoker
      'devastation': 'evoker',
      'preservation': 'evoker',
      'augmentation': 'evoker'
    };

    return specClassMap[specName] || null;
  }

  // Parse SimC input and extract equipped items
  static parseEquippedItems(simcInput) {
    const lines = simcInput.split('\n');
    const equippedItems = {};
    
    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('//')) continue;
      
      // Match equipment lines like: head=,id=231824,gem_id=213743,bonus_id=...
      const equipMatch = line.match(/^([a-z_]+)=,(.+)$/);
      if (equipMatch) {
        const slot = equipMatch[1];
        const itemData = equipMatch[2];
        
        equippedItems[slot] = SimcParser.parseItemData(itemData);
      }
    }
    
    return equippedItems;
  }

  // Parse individual item data from SimC format
  static parseItemData(itemDataString) {
    const parts = itemDataString.split(',');
    const item = {};
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (!key || !value) continue;
      
      switch (key) {
        case 'id':
          item.id = parseInt(value);
          break;
        case 'enchant_id':
          item.enchant_id = parseInt(value);
          break;
        case 'gem_id':
          item.gem_id = value.split('/').map(id => parseInt(id));
          break;
        case 'bonus_id':
          item.bonus_id = value.split('/').map(id => parseInt(id));
          break;
        case 'crafted_stats':
          item.crafted_stats = value.split('/').map(id => parseInt(id));
          break;
      }
    }
    
    return item;
  }

  // Create character info string for SimC output
  static createCharacterInfoString(characterInfo) {
    const charInfo = [];
    
    if (characterInfo.class && characterInfo.name) {
      charInfo.push(`${characterInfo.class}="${characterInfo.name}"`);
    }
    
    if (characterInfo.level) {
      charInfo.push(`level=${characterInfo.level}`);
    }
    
    if (characterInfo.race) {
      charInfo.push(`race=${characterInfo.race}`);
    }
    
    if (characterInfo.region) {
      charInfo.push(`region=${characterInfo.region}`);
    }
    
    if (characterInfo.server) {
      charInfo.push(`server=${characterInfo.server}`);
    }
    
    if (characterInfo.spec) {
      charInfo.push(`spec=${characterInfo.spec}`);
    }
    
    return charInfo.join('\n');
  }

  // Validate character class/spec combination
  static validateCharacterInfo(characterInfo) {
    if (!characterInfo.class || !characterInfo.spec) {
      return {
        valid: false,
        error: 'Missing class or spec information'
      };
    }

    const classData = ConstraintValidator.getClassConstraints(characterInfo.class);
    if (!classData) {
      return {
        valid: false,
        error: `Unknown class: ${characterInfo.class}`
      };
    }

    const specData = ConstraintValidator.getSpecConstraints(characterInfo.class, characterInfo.spec);
    if (!specData) {
      return {
        valid: false,
        error: `Unknown spec: ${characterInfo.spec} for class: ${characterInfo.class}`
      };
    }

    return { valid: true };
  }
}

export default SimcParser;
```

