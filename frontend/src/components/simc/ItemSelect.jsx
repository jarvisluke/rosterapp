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