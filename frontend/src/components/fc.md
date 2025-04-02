`Simc.jsx`
```jsx
import { useEffect, useRef, useState } from 'react';
import AddonInput from './AddonInput';
import ArmoryInput from './ArmoryInput';
import ItemSelect from './ItemSelect';
import fetchApi from '../util/api';

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

const CharacterDisplay = ({ character }) => {
  return character ? (
    <div className="card mt-3 mb-3">
      <div className="card-body">
        <h5 className="card-title">
          {character.name}
          {character.realm?.displayName &&
            `-${character.realm.displayName}`}
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

function SimulationReport({ htmlContent, height = '500px' }) {
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

function CollapsibleSection({ title, children, initialExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  return (
    <div className="mb-4">
      <div
        className="d-flex justify-content-between align-items-center p-2 border-bottom"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h5 className="m-1">{title}</h5>
        <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
      </div>
      <div
        className="overflow-hidden"
        style={{
          maxHeight: isExpanded ? '2000px' : '0',
          opacity: isExpanded ? 1 : 0,
          transition: `max-height 0.5s ease-in-out, opacity ${isExpanded ? '0.5s' : '0.3s'} ease-in-out`
        }}
      >
        <div className="pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function Simc() {
  const [inputMode, setInputMode] = useState('addon');
  const [characterData, setCharacterData] = useState(null);
  const [itemsData, setItemsData] = useState(null);
  const [realmIndex, setRealmIndex] = useState(null);
  const [simcInput, setSimcInput] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationResultRef = useRef(null);

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

  // Transform items object into array format for ItemSelect
  const prepareItemsForDisplay = () => {
    if (!itemsData) return [];

    return Object.entries(itemsData)
      .filter(([slotKey, _]) => !skippedSlots.includes(slotKey))
      .map(([slotKey, data]) => {
        return {
          name: slotDisplayNames[slotKey] || slotKey.charAt(0).toUpperCase() + slotKey.slice(1).replace('_', ' '),
          slotKey: slotKey,  // Keep the original slot key for internal use
          equipped: data.equipped,
          alternatives: data.alternatives || []
        };
      });
  };

  const runSimulation = async () => {
    if (!characterData) return;

    setIsSimulating(true);

    try {
      let input;
      if (inputMode === 'addon') {
        input = simcInput; // Use the raw SimC addon input
      } else {
        // Format armory input
        input = `armory=${characterData.region},${characterData.realm.name},${characterData.name}`;
      }

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

      <div className="input-group mb-3">
        <span class="input-group-text" id="basic-addon1">Select input type</span>
        <select
          className="form-select"
          value={inputMode}
          onChange={(e) => {
            setInputMode(e.target.value);
            setCharacterData(null);
            setItemsData(null);
          }}
        >
          <option value="addon">SimC Addon <span className='text-body-secondary'>(/simc)</span></option>
          <option value="armory">Load from Armory</option>
        </select>
      </div>
      <div className="mb-2">
        <input type="radio" class="btn-check" name="options-outlined" id="addon_radio" autocomplete="off" checked />
        <label class="btn btn-outline-primary me-2" for="addon_radio">SimC Addon</label>
        <input type="radio" class="btn-check" name="options-outlined" id="armory_radio" autocomplete="off" />
        <label class="btn btn-outline-primary" for="armory_radio">Armory</label>
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
          <ItemSelect slots={prepareItemsForDisplay()} />
        </CollapsibleSection>
      )}

      {/* Sticky simulation button */}
      <div
        className="position-fixed bottom-0 start-0 w-100 bg-body py-3"
        style={{ zIndex: 1000 }}
      >
        <div className="container text-center">
          <button
            className="btn btn-primary"
            disabled={!canSimulate || isSimulating}
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
    </div>
  );
}

export default Simc;
```

`ArmoryInput.jsx`
```jsx
import { useState, useRef, useEffect } from 'react';

const ArmoryInput = ({ onDataUpdate, pairedSlots, skippedSlots, realmIndex }) => {
  const [character, setCharacter] = useState('');
  const [realmSearch, setRealmSearch] = useState('');
  const [selectedRealm, setSelectedRealm] = useState('');
  const [showRealmDropdown, setShowRealmDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const regions = ['us', 'eu', 'kr', 'tw'];
  const [selectedRegion, setSelectedRegion] = useState('us');

  // Handle clicks outside the realm dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        inputRef.current && !inputRef.current.contains(event.target)) {
        setShowRealmDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, inputRef]);

  const handleCharacterChange = (e) => {
    const newValue = e.target.value.replace(/[^A-Za-zÀ-ÿ]/g, '');
    setCharacter(newValue);
    if (error) setError(null);
  };

  const handleRealmSearch = (e) => {
    setRealmSearch(e.target.value);
    setShowRealmDropdown(true);
    if (error) setError(null);
  };

  const handleRealmSelect = (slug, name) => {
    setSelectedRealm(slug);
    setRealmSearch(name);
    setShowRealmDropdown(false);
    if (error) setError(null);
  };

  const lookupCharacter = async () => {
    if (!selectedRealm || !character) {
      onDataUpdate(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/character/${selectedRealm}/${character.toLowerCase()}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Character not found' : 'Error fetching character');
      }

      const data = await response.json();

      // Transform the API data into the same format as AddonInput
      const transformedData = transformArmoryData(data);
      onDataUpdate(transformedData);

    } catch (error) {
      setError(error.message);
      onDataUpdate(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform Armory API data to match the format from AddonInput
  const transformArmoryData = (data) => {
    // Map item slots from API to our internal format
    const itemSlotMap = {
      HEAD: 'head',
      NECK: 'neck',
      SHOULDER: 'shoulder',
      BACK: 'back',
      CHEST: 'chest',
      SHIRT: 'shirt',
      WRIST: 'wrist',
      HANDS: 'hands',
      WAIST: 'waist',
      LEGS: 'legs',
      FEET: 'feet',
      FINGER_1: 'finger1',
      FINGER_2: 'finger2',
      TRINKET_1: 'trinket1',
      TRINKET_2: 'trinket2',
      MAIN_HAND: 'main_hand',
      OFF_HAND: 'off_hand'
    };

    // Initialize items structure
    const items = {};

    // Process equipped items
    if (data.equipment && data.equipment.equipped_items) {
      data.equipment.equipped_items.forEach(item => {
        const slotName = itemSlotMap[item.slot.type] || item.slot.type.toLowerCase();

        // Skip slots that should be ignored
        if (skippedSlots.includes(slotName)) return;

        // Initialize slot if it doesn't exist
        if (!items[slotName]) {
          items[slotName] = {
            equipped: null,
            alternatives: []
          };
        }

        // Create item data structure
        const itemData = {
          id: item.item.id.toString(),
          name: item.name,
          enchant: item.enchantments?.[0]?.enchantment_id?.toString() || null,
          gems: item.sockets?.filter(s => s.item)?.map(s => s.item.id.toString()) || [],
          bonusIds: item.bonus_list?.map(b => b.toString()) || [],
          itemLevel: item.level.value.toString()
        };

        // Set as equipped
        items[slotName].equipped = itemData;

        // For paired slots, add as alternative to the paired slot
        const pairedSlot = pairedSlots[slotName];
        if (pairedSlot) {
          if (!items[pairedSlot]) {
            items[pairedSlot] = {
              equipped: null,
              alternatives: []
            };
          }

          // Add to paired slot alternatives if not already there
          if (!items[pairedSlot].alternatives.some(alt => alt.id === itemData.id)) {
            items[pairedSlot].alternatives.push({ ...itemData });
          }
        }
      });
    }

    // Character info
    return {
      character: {
        name: data.name,
        level: data.level,
        race: { name: data.race?.name?.toLowerCase() || 'unknown' },
        realm: {
          name: data.realm?.slug,
          displayName: data.realm?.name
        },
        region: selectedRegion,
        character_class: { name: data.character_class?.name || 'Unknown' },
        spec: data.active_spec?.name?.toLowerCase() || 'unknown',
      },
      items
    };
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedRealm && character && character.length >= 2) {
        lookupCharacter();
      } else {
        onDataUpdate(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedRealm, character, selectedRegion]);

  const filteredRealms = realmIndex?.realms
    .filter(realm =>
      realm.name.toLowerCase().includes(realmSearch.toLowerCase())
    )
    .sort((a, b) => {
      const aStartsWith = a.name.toLowerCase().startsWith(realmSearch.toLowerCase());
      const bStartsWith = b.name.toLowerCase().startsWith(realmSearch.toLowerCase());
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.name.localeCompare(b.name);
    }) ?? [];

  return (
    <div className="mt-3">
      <div className="input-group input-group-lg">
        {/* Region Select */}
        <div className="form-floating">
          <select
            className="form-select"
            id="regionSelect"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            {regions.map(region => (
              <option key={region} value={region}>
                {region.toUpperCase()}
              </option>
            ))}
          </select>
          <label htmlFor="regionSelect">Region</label>
        </div>

        {/* Realm Search */}
        <div className="form-floating position-relative">
          <input
            type="text"
            className="form-control"
            id="realmInput"
            value={realmSearch}
            onChange={handleRealmSearch}
            onClick={() => setShowRealmDropdown(true)}
            placeholder="Search realm"
            ref={inputRef}
          />
          <label htmlFor="realmInput">Realm</label>

          {showRealmDropdown && filteredRealms.length > 0 && (
            <div
              className="position-absolute w-100 start-0 mt-1 bg-white border rounded-3 shadow-sm overflow-auto"
              style={{ maxHeight: '200px', zIndex: 1000 }}
              ref={dropdownRef}
            >
              {filteredRealms.map(realm => (
                <button
                  key={realm.id}
                  className="dropdown-item btn btn-link text-start w-100 p-2"
                  onClick={() => handleRealmSelect(realm.slug, realm.name)}
                >
                  {realm.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Character Input */}
        <div className="form-floating">
          <input
            type="text"
            className={`form-control ${error ? 'is-invalid' : ''}`}
            id="characterInput"
            maxLength={32}
            value={character}
            onChange={handleCharacterChange}
            placeholder="Character"
          />
          <label htmlFor="characterInput">Character</label>
          <div className="invalid-feedback">
            {error}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="mt-3 text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArmoryInput;
```

