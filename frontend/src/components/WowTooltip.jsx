import React, { useEffect } from 'react';

const WowTooltip = ({ item, spec }) => {
  useEffect(() => {
    // Refresh Wowhead tooltips when component mounts or props change
    if (window.$WowheadPower && window.$WowheadPower.refreshLinks) {
      window.$WowheadPower.refreshLinks();
    }
  }, [item, spec]);

  // Convert bonus IDs to string format
  const bonusString = item.bonusIds?.length > 0 
    ? item.bonusIds.join(':') 
    : '';

  // Convert gems to string format
  const gemsString = item.gems?.length > 0 
    ? `&gems=${item.gems.join(':')}` 
    : '';

  // Include item level if available
  const ilvlString = item.itemLevel 
    ? `&ilvl=${item.itemLevel}` 
    : '';

  // Include spec if available
  const specString = spec 
    ? `&spec=${spec}` 
    : '';

  // Build the data-wowhead attribute
  const dataAttrs = [];
  if (item.bonusIds?.length > 0) {
    dataAttrs.push(`bonus=${item.bonusIds.join(':')}`);
  }
  if (item.gems?.length > 0) {
    dataAttrs.push(`gems=${item.gems.join(':')}`);
  }
  if (item.itemLevel) {
    dataAttrs.push(`ilvl=${item.itemLevel}`);
  }
  if (spec) {
    dataAttrs.push(`spec=${spec}`);
  }

  return (
    <a
      href={`//www.wowhead.com/item=${item.id}?bonus=${bonusString}${gemsString}${ilvlString}${specString}`}
      rel="noopener"
      data-wowhead={dataAttrs.join('&')}
      target="_blank"
      style={{ textDecoration: 'none', display: 'inline-block' }}
      className="q3"
    >
      {item.name || `Item ${item.id}`}
    </a>
  );
};

export default WowTooltip;