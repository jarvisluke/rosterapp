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
      onDataUpdate(transformArmoryData(data)); // Pass the transformed data directly

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

    const characterData = {
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
      items: items
    };

    return characterData;
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