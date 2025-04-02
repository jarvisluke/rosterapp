import { useState, useEffect } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';

// Quality color mapping
const QUALITY_COLORS = {
  POOR: 'rgb(157, 157, 157)',
  COMMON: 'rgb(255, 255, 255)',
  UNCOMMON: 'rgb(30, 255, 0)',
  RARE: 'rgb(0, 112, 221)',
  EPIC: 'rgb(163, 53, 238)',
  LEGENDARY: 'rgb(255, 128, 0)',
  ARTIFACT: 'rgb(230, 204, 128)',
  HEIRLOOM: 'rgb(0, 204, 255)',
};

const BONUS_TEXT_GREEN = 'rgb(0, 255, 0)';
const BONUS_TEXT_GOLD = 'rgb(255, 200, 100)';

function ItemIcon({ mediaUrl, size = 56, item }) {
  const [iconUrl, setIconUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [socketIcons, setSocketIcons] = useState([]);


  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start',
    middleware: [offset(10), shift()],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context);
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // String sanitization function
  const sanitizeString = (str) => {
    if (!str) return '';
    return str.split(/[\|<>]/)
      .filter(Boolean)
      .map(part => part.trim())
      .filter(Boolean)[0] || str;
  };

  useEffect(() => {
    // Use assets directly from item.media if available
    if (item?.media?.assets) {
      const icon = item.media.assets.find(asset => asset.key === 'icon');
      if (icon) {
        setIconUrl(icon.value);
      }
    }

    // Handle socket icons
    if (item?.sockets) {
      const icons = item.sockets.map((socket) => {
        if (!socket.media?.assets) {
          return { text: sanitizeString(socket.display_string) };
        }
        
        const socketIcon = socket.media.assets.find(asset => asset.key === 'icon');
        return {
          icon: socketIcon?.value,
          text: sanitizeString(socket.display_string),
          color: socket.display_color
        };
      });
      
      setSocketIcons(icons.filter(Boolean));
    }

    setLoading(false);
  }, [item]);

  const renderColoredText = (displayInfo) => {
    if (!displayInfo) return null;
    const style = displayInfo.color ? {
      color: `rgb(${displayInfo.color.r}, ${displayInfo.color.g}, ${displayInfo.color.b})`
    } : {};
    return <div style={style}>{sanitizeString(displayInfo.display_string)}</div>;
  };

  if (loading) return <div className="spinner-border spinner-border-sm"></div>;
  if (error || !iconUrl) return null;

  const qualityColor = item?.quality ? QUALITY_COLORS[item.quality.type] : QUALITY_COLORS.COMMON;

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        <img
          src={iconUrl}
          alt="Item icon"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      </div>
      {isOpen && item && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              background: '#1a1a1a',
              color: 'white',
              padding: '12px',
              borderRadius: '4px',
              maxWidth: '300px',
              zIndex: 1000,
            }}
            {...getFloatingProps()}
          >
            {/* Name with quality color */}
            <div style={{ color: qualityColor, fontWeight: 'bold' }}>{item.name}</div>

            {/* Name Description */}
            {item.name_description && renderColoredText(item.name_description)}

            {/* Item Level */}
            {item.level && <div
              style={{ color: BONUS_TEXT_GOLD }}
            >
              {sanitizeString(item.level.display_string)}
            </div>}

            {/* Binding */}
            {item.binding && <div>{item.binding.name}</div>}

            {/* Item Subclass & Inventory Type */}
            {(item.inventory_type || item.item_subclass) && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{item.inventory_type?.name || ''}</div>
                {item.item_subclass?.name !== "Miscellaneous" && (
                  <div style={{ color: 'white' }}>{item.item_subclass?.name || ''}</div>
                )}
              </div>
            )}

            {/* Stats */}
            {item.armor && renderColoredText(item.armor.display)}
            {item.stats?.map((stat, idx) => (
              <div key={idx}>{renderColoredText(stat.display)}</div>
            ))}

            {/* Enchantments */}
            {item.enchantments?.map((enchant, idx) => (
              <div
                key={idx}
                style={{ color: BONUS_TEXT_GREEN }}
              >
                {sanitizeString(enchant.display_string)}
              </div>
            ))}

            {/* Sockets with icons */}
            {socketIcons.map((socket, idx) => (
              <div key={idx} style={{
                color: socket.color ?
                  `rgb(${socket.color.r}, ${socket.color.g}, ${socket.color.b})` :
                  'white'
              }}>
                {socket.icon && (
                  <img
                    src={socket.icon}
                    alt="Socket"
                    style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '5px' }}
                  />
                )}
                {socket.text}
              </div>
            ))}

            {/* Spells */}
            {item.spells?.map((spell, idx) => (
              <div
                key={idx}
                style={{ color: BONUS_TEXT_GREEN }}
              >
                {sanitizeString(spell.description)}
              </div>
            ))}

            {/* Requirements */}
            {item.requirements?.level && <div>{sanitizeString(item.requirements.level.display_string)}</div>}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default ItemIcon;