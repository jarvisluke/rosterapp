import { useMemo, memo } from 'react';
import ItemSelect from './ItemSelect';
import CollapsibleSection from './CollapsibleSection';
import { ConstraintValidator } from './ClassConstraints';

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

export default EquipmentSection;