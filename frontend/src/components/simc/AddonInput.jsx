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

              if (!items[slot]) {
                items[slot] = {
                  equipped: null,
                  alternatives: []
                };
              }

              // For paired slots, initialize the paired slot if it doesn't exist
              if (pairedSlots[slot] && !items[pairedSlots[slot]]) {
                items[pairedSlots[slot]] = {
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

                  // For paired slots, add this item as an alternative to the paired slot
                  if (pairedSlots[slot] && !items[pairedSlots[slot]].alternatives.some(item => item.id === itemId) &&
                    !(items[pairedSlots[slot]].equipped && items[pairedSlots[slot]].equipped.id === itemId)) {
                    items[pairedSlots[slot]].alternatives.push(itemData);
                  }
                }
              } else {
                items[slot].equipped = itemData;

                // For paired slots, add the equipped item as an alternative to paired slot
                if (pairedSlots[slot] &&
                  !items[pairedSlots[slot]].alternatives.some(item => item.id === itemId) &&
                  !(items[pairedSlots[slot]].equipped && items[pairedSlots[slot]].equipped.id === itemId)) {
                  items[pairedSlots[slot]].alternatives.push({ ...itemData });
                }
              }
            }
          }
        }
      }

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

  /* // Initialize Wowhead tooltips when data changes
  useEffect(() => {
    if (window.$WowheadPower && window.$WowheadPower.refreshLinks) {
      setTimeout(() => {
        window.$WowheadPower.refreshLinks();
      }, 100);
    }
  }, [simcInput]); */

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