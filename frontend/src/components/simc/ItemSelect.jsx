import { useEffect, useState, useRef } from 'react';
import ItemSlot from './ItemSlot';

const ItemSelect = ({ slots, onCombinationsGenerated }) => {
  const [selectedItems, setSelectedItems] = useState({});
  const [uniqueConstraints, setUniqueConstraints] = useState({});
  const [canGenerateCombinations, setCanGenerateCombinations] = useState(false);
  const combinationCallbackRef = useRef(onCombinationsGenerated);

  // Track the callback reference
  useEffect(() => {
    combinationCallbackRef.current = onCombinationsGenerated;
  }, [onCombinationsGenerated]);

  // Initialize selected items and extract constraints when slots change
  useEffect(() => {
    if (!slots || slots.length === 0) return;

    // Initialize with equipped items only
    const initialSelectedItems = {};
    slots.forEach(slot => {
      if (slot.equipped) {
        if (!initialSelectedItems[slot.slotKey]) {
          initialSelectedItems[slot.slotKey] = [];
        }
        initialSelectedItems[slot.slotKey].push({
          id: slot.equipped.id,
          item: slot.equipped
        });
      }
    });

    setSelectedItems(initialSelectedItems);

    // Extract unique-equipped constraints from item data
    extractUniqueConstraints(slots);
  }, [slots]);

  // Generate combinations when selections change
  useEffect(() => {
    if (!slots || slots.length === 0) return;

    const allSlotsHaveSelection = slots.every(slot =>
      selectedItems[slot.slotKey] && selectedItems[slot.slotKey].length > 0
    );

    setCanGenerateCombinations(allSlotsHaveSelection);

    // Automatically generate combinations when selection changes and all slots have items
    if (allSlotsHaveSelection) {
      const combinations = generateCombinations();
      if (combinationCallbackRef.current) {
        combinationCallbackRef.current(combinations);
      }
    }
  }, [selectedItems, slots]);

  // Extract unique-equipped constraints from items
  const extractUniqueConstraints = (slots) => {
    const constraints = {};

    slots.forEach(slot => {
      const processItem = (item) => {
        if (item.unique_equipped) {
          constraints[item.id] = {
            type: 'unique-equipped',
            value: item.unique_equipped
          };
        } else if (item.flags && item.flags.includes('unique-equipped')) {
          constraints[item.id] = {
            type: 'unique-equipped',
            value: true
          };
        }

        // Process unique-equipped with limits (like embellishments)
        if (item.unique_equipped_category) {
          if (!constraints[item.unique_equipped_category]) {
            constraints[item.unique_equipped_category] = {
              type: 'unique-equipped-category',
              items: [],
              limit: item.unique_equipped_limit || 1
            };
          }
          constraints[item.unique_equipped_category].items.push(item.id);
        }
      };

      if (slot.equipped) {
        processItem(slot.equipped);
      }

      slot.alternatives.forEach(processItem);
    });

    setUniqueConstraints(constraints);
  };

  // Handle item selection/deselection
  const handleItemToggle = (slotKey, itemId, item, isSelected) => {
    setSelectedItems(prevSelected => {
      const newSelected = { ...prevSelected };

      if (!newSelected[slotKey]) {
        newSelected[slotKey] = [];
      }

      if (isSelected) {
        // Add the item if it doesn't exist
        if (!newSelected[slotKey].some(selected => selected.id === itemId)) {
          newSelected[slotKey].push({ id: itemId, item });
        }
      } else {
        // Remove the item
        newSelected[slotKey] = newSelected[slotKey].filter(selected => selected.id !== itemId);
      }

      return newSelected;
    });
  };

  // Helper function to check if a combination violates unique-equipped constraints
  const isValidCombination = (combination) => {
    // Track unique-equipped items
    const uniqueEquippedItems = new Set();
    // Track category counts
    const categoryCount = {};

    for (const slotKey in combination) {
      const item = combination[slotKey];

      // Skip if no item in this slot
      if (!item) continue;

      // Check simple unique-equipped constraint
      if (uniqueConstraints[item.id]?.type === 'unique-equipped') {
        if (uniqueEquippedItems.has(item.id)) {
          return false; // Item already used in another slot
        }
        uniqueEquippedItems.add(item.id);
      }

      // Check category constraints
      if (item.unique_equipped_category) {
        const category = item.unique_equipped_category;
        if (!categoryCount[category]) {
          categoryCount[category] = 0;
        }
        categoryCount[category]++;

        const limit = uniqueConstraints[category]?.limit || 1;
        if (categoryCount[category] > limit) {
          return false; // Category limit exceeded
        }
      }
    }

    return true;
  };

  // Generate all possible combinations
  const generateAllPossibleCombinations = () => {
    // Convert selected items object to array of arrays
    const slotKeys = Object.keys(selectedItems);
    const slotItems = slotKeys.map(slotKey =>
      selectedItems[slotKey].map(selectedItem => ({
        slotKey,
        ...selectedItem
      }))
    );

    // Start with an empty combination
    let combinations = [{}];

    // For each slot, add each possible item to each existing combination
    for (const slotItemsArray of slotItems) {
      const newCombinations = [];

      for (const combo of combinations) {
        for (const slotItem of slotItemsArray) {
          // Create new combination with this item in this slot
          const newCombo = { ...combo };
          newCombo[slotItem.slotKey] = slotItem.item;
          newCombinations.push(newCombo);
        }
      }

      combinations = newCombinations;
    }

    return combinations;
  };

  // Generate combinations based on selected items, respecting unique constraints
  const generateCombinations = () => {
    if (!canGenerateCombinations) return [];

    // Generate all possible combinations
    const allCombinations = generateAllPossibleCombinations();

    // Filter out invalid combinations
    const validCombinations = allCombinations.filter(isValidCombination);

    console.log(`Generated ${validCombinations.length} valid combinations out of ${allCombinations.length} combinations`);
    console.log("Combinations:", validCombinations);

    return validCombinations;
  };

  // Keep the original render method
  if (!slots || slots.length === 0) return null;

  return (
    <div className="row row-cols-1 row-cols-md-3 g-3 justify-content-center">
      {slots.map(slot => (
        <div className="col" key={slot.slotKey}>
          <ItemSlot
            {...slot}
            onItemToggle={(itemId, item, isSelected) =>
              handleItemToggle(slot.slotKey, itemId, item, isSelected)
            }
            selectedItems={selectedItems[slot.slotKey] || []}
          />
        </div>
      ))}
    </div>
  );
};

export default ItemSelect;