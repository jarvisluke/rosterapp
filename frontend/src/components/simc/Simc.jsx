import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  memo
} from 'react';
import AddonInput from './AddonInput';
import ItemSelect from './ItemSelect';
import { apiClient, ApiError } from '../../util/api';
import CollapsibleSection from './CollapsibleSection';
import CharacterDisplay from './CharacterDisplay';
import SimulationReport from './SimulationReport';
import CombinationsDisplay from './CombinationsDisplay';
import AdditionalOptions, { DEFAULT_OPTIONS } from './AdditionalOptions';
import AsyncSimulationDisplay from './AsyncSimulationDisplay';
import EquipmentSection from './EquipmentSection';
import { SimcParser } from './SimcParser';

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
const SimulationResults = memo(({ result, characterName = 'character' }) => {
  const downloadReport = useCallback(() => {
    if (!result) return;

    const blob = new Blob([result], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${characterName}_sim_report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, characterName]);

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
  // UI State only - things that affect rendering
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [hasValidData, setHasValidData] = useState(false);
  const [characterDisplayData, setCharacterDisplayData] = useState(null);
  const [parseError, setParseError] = useState(null);

  // Data refs - things that don't need to trigger re-renders
  const rawSimcInputRef = useRef('');
  const characterInfoRef = useRef(null);
  const itemsDataRef = useRef(null);
  const combinationsRef = useRef([]);
  const simOptionsRef = useRef(DEFAULT_OPTIONS);

  const simulationUtilsRef = useRef({
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
    }
  });

  const resultsRef = useRef(null);

  // Parse and validate data whenever input changes
  const parseAndValidateData = useCallback((data) => {
    if (!data || !data.rawInput) {
      // Clear all data
      rawSimcInputRef.current = '';
      characterInfoRef.current = null;
      itemsDataRef.current = null;
      combinationsRef.current = [];
      setCharacterDisplayData(null);
      setHasValidData(false);
      setParseError(null);
      return;
    }

    try {
      // Store raw input
      rawSimcInputRef.current = data.rawInput;

      // Extract and validate character info using SimcParser
      const extractedCharacterInfo = SimcParser.extractCharacterInfo(data.rawInput);
      const validation = SimcParser.validateCharacterInfo(extractedCharacterInfo);
      
      if (!validation.valid) {
        throw new Error(`Character validation failed: ${validation.error}`);
      }

      // Store validated data in refs
      characterInfoRef.current = extractedCharacterInfo;
      itemsDataRef.current = data.items;
      
      // Set display data for components that need to re-render
      setCharacterDisplayData(data.character);
      setHasValidData(true);
      setParseError(null);

      console.log('Parsed character info:', extractedCharacterInfo);
      console.log('Items data:', data.items);

    } catch (error) {
      console.error('Error parsing SimC data:', error);
      
      // Clear data on error
      characterInfoRef.current = null;
      itemsDataRef.current = null;
      combinationsRef.current = [];
      setCharacterDisplayData(null);
      setHasValidData(false);
      setParseError(error.message);
    }
  }, []);

  // Handle data updates from AddonInput
  const handleDataUpdate = useCallback((data) => {
    parseAndValidateData(data);
  }, [parseAndValidateData]);

  // Handle combinations updates
  const handleCombinationsUpdate = useCallback((newCombinations) => {
    combinationsRef.current = newCombinations;
    console.log(`Updated combinations: ${newCombinations.length} combinations`);
  }, []);

  // Handle options changes
  const handleOptionsChange = useCallback((newOptions) => {
    simOptionsRef.current = newOptions;
  }, []);

  // Add simulation options to input text
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

  // Format combinations for simulation
  const formatCombinations = useCallback(() => {
    const combinations = combinationsRef.current;
    const characterInfo = characterInfoRef.current;
    const itemsData = itemsDataRef.current;
    const rawInput = rawSimcInputRef.current;

    if (!combinations.length || !characterInfo || !itemsData) return '';

    const { createEquippedCombination, formatItemForSimC } = simulationUtilsRef.current;

    let combinationsText = '';
    
    // Create character info string
    const characterInfoString = SimcParser.createCharacterInfoString(characterInfo);
    combinationsText += `${characterInfoString}\n\n`;

    // Extract talents and other settings from original input
    const lines = rawInput.split('\n');
    const additionalSettings = lines.filter(line => {
      if (line.startsWith('#') || line.startsWith('//')) return true;
      if (line.startsWith('talents=') || line.startsWith('professions=')) return true;
      return false;
    });

    if (additionalSettings.length > 0) {
      combinationsText += additionalSettings.join('\n') + '\n\n';
    }

    // Add equipped combination first
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

    // Add alternative combinations
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

    return addSimulationOptions(combinationsText);
  }, [addSimulationOptions]);

  // Check if we can simulate
  const canSimulate = useMemo(() => {
    return hasValidData && characterInfoRef.current && rawSimcInputRef.current;
  }, [hasValidData]);

  // Run simulation
  const runSimulation = useCallback(async () => {
    const characterInfo = characterInfoRef.current;
    const rawInput = rawSimcInputRef.current;

    if (!characterInfo || !rawInput) return;

    setIsSimulating(true);

    try {
      let input;

      if (combinationsRef.current.length > 0) {
        input = formatCombinations();
      } else {
        // Use raw input with character info and add options
        const lines = rawInput.split('\n').filter(line => !line.startsWith('Simulation input:'));
        const characterInfoString = SimcParser.createCharacterInfoString(characterInfo);

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

      console.log("Simulation input:", input);

      // Submit simulation using the API client
      const data = await apiClient.post('/api/simulate/async', {
        simc_input: btoa(input)
      }, {
        timeout: 10000,
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
  }, [formatCombinations, addSimulationOptions]);

  // Scroll to results
  const scrollToResults = useCallback(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Handle simulation completion
  const handleSimulationComplete = useCallback((result) => {
    if (result) {
      setSimulationResult(result);
      setTimeout(() => scrollToResults(), 100);
    }
    setCurrentJobId(null);
    setIsSimulating(false);
  }, [scrollToResults]);

  // Handle simulation close
  const handleSimulationClose = useCallback(() => {
    setCurrentJobId(null);
    setIsSimulating(false);
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
          characterName={characterDisplayData?.name || 'character'}
        />
      </div>

      <AddonInput
        onDataUpdate={handleDataUpdate}
        pairedSlots={{ main_hand: 'off_hand', off_hand: 'main_hand', finger1: 'finger2', finger2: 'finger1', trinket1: 'trinket2', trinket2: 'trinket1' }}
        skippedSlots={['tabard', 'shirt']}
      />

      {parseError && (
        <div className="alert alert-danger mt-3">
          <strong>Parse Error:</strong> {parseError}
        </div>
      )}

      <CharacterDisplay 
        character={characterDisplayData} 
        characterInfo={characterInfoRef.current} 
      />

      {hasValidData && (
        <EquipmentSection
          itemsData={itemsDataRef.current}
          onCombinationsGenerated={handleCombinationsUpdate}
          characterInfo={characterInfoRef.current}
        />
      )}

      {hasValidData && (
        <CollapsibleSection title="Additional Options">
          <AdditionalOptions
            onChange={handleOptionsChange}
          />
        </CollapsibleSection>
      )}

      {hasValidData && (
        <CollapsibleSection title="Simulation Setup" defaultOpen={true}>
          <CombinationsDisplay
            combinations={combinationsRef.current}
            characterData={characterDisplayData}
            itemsData={itemsDataRef.current}
            characterInfo={characterInfoRef.current}
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