import { useEffect, useState } from "react";
import WowTooltip from '../WowTooltip';

const Item = ({ item, slotKey, defaultChecked, onToggle, isSelected }) => {
  const [checked, setChecked] = useState(defaultChecked);
  const htmlId = `${slotKey}_item_${item.id}`
  
  // Sync with parent component's state
  useEffect(() => {
    setChecked(isSelected);
  }, [isSelected]);

  const handleChange = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    if (onToggle) onToggle(newChecked);
  };

  return (
    <div className="d-flex align-items-center">
      <label className="flex-grow-1" id="basic-addon1" htmlFor={htmlId}>
        <WowTooltip
          item={{
            id: item.id,
            name: item.name,
            itemLevel: item.level?.value || item.itemLevel,
            bonusIds: item.bonus_list || item.bonusIds,
            gems: item.sockets?.map(socket => socket.item.id) || item.gems,
            enchant: item.enchant
          }}
        />
        {item.unique_equipped && (
          <span className="badge bg-warning ms-1" title="Unique-Equipped">U</span>
        )}
      </label>
      <input className="form-check-input"
        type="checkbox"
        id={htmlId}
        checked={checked}
        onChange={handleChange}
      />
    </div>
  );
};

export default Item;