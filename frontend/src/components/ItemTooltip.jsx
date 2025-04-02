import { useState } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, useHover, useInteractions } from '@floating-ui/react';
import ItemIcon from './ItemIcon';

function ItemTooltip({ item }) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom',
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate
  });

  const hover = useHover(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  const getColorStyle = (color) => {
    if (!color) return {};
    return { color: `rgb(${color.r}, ${color.g}, ${color.b})` };
  };

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        <ItemIcon mediaUrl={item.media?.key?.href} />
      </div>
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '10px',
            width: '300px',
            zIndex: 9999
          }}
          {...getFloatingProps()}
        >
          {/* Name */}
          <div style={{ ...getColorStyle(item.quality?.color), fontWeight: 'bold', fontSize: '16px' }}>
            {item.name}
          </div>

          {/* Name Description */}
          {item.name_description && (
            <div style={getColorStyle(item.name_description.color)}>
              {item.name_description.display_string}
            </div>
          )}

          {/* Item Level */}
          <div>{item.level?.display_string}</div>

          {/* Binding */}
          <div>{item.binding?.name}</div>

          {/* Item Subclass & Inventory Type */}
          {(item.item_subclass?.name !== "Miscellaneous" || item.inventory_type) && (
            <div>
              {item.item_subclass?.name !== "Miscellaneous" && item.item_subclass?.name}
              {item.item_subclass?.name !== "Miscellaneous" && item.inventory_type && " "}
              {item.inventory_type?.name}
            </div>
          )}

          {/* Stats */}
          {item.stats?.map((stat, index) => (
            <div key={index} style={getColorStyle(stat.display?.color)}>
              {stat.display?.display_string}
            </div>
          ))}

          {/* Sockets */}
          {item.sockets?.map((socket, index) => (
            <div key={index}>{socket.display_string}</div>
          ))}

          {/* Durability */}
          {item.durability && (
            <div>{item.durability.display_string}</div>
          )}

          {/* Requirements */}
          {item.requirements?.level && (
            <div>{item.requirements.level.display_string}</div>
          )}
        </div>
      )}
    </>
  );
}

export default ItemTooltip;