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