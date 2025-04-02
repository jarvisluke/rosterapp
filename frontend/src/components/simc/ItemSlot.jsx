import Item from './Item';

const ItemSlot = ({ name, slotKey, equipped, alternatives, onItemToggle, selectedItems }) => {
  // Get array of selected item IDs for easier comparison
  const selectedItemIds = selectedItems ? selectedItems.map(item => item.id) : [];

  return (
    <div className="card">
      <div className="card-header bg-dark-subtle text-muted">
        <strong>{name}</strong>
      </div>
      <div className="list-group list-group-flush">
        {equipped && (
          <div className="list-group-item">
            <Item 
              item={equipped} 
              slotKey={slotKey} 
              defaultChecked={true}
              onToggle={(isChecked) => onItemToggle(equipped.id, equipped, isChecked)}
              isSelected={selectedItemIds.includes(equipped.id)}
            />
          </div>
        )}
        {alternatives.map((item, index) => (
          <div className="list-group-item list-group-item-secondary" key={index}>
            <Item 
              item={item} 
              slotKey={slotKey} 
              defaultChecked={false}
              onToggle={(isChecked) => onItemToggle(item.id, item, isChecked)}
              isSelected={selectedItemIds.includes(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemSlot;