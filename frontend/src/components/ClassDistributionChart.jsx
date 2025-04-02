import React, { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import { useFloating, autoUpdate, offset, flip, shift, useHover, useFocus, useDismiss, useRole, useInteractions, FloatingPortal } from '@floating-ui/react';
import { getClassColor } from '../util';
import PlayableClassIcon from './PlayableClassIcon';

const CustomTooltip = ({ isOpen, setIsOpen, data, refs, floatingStyles, getFloatingProps }) => {
  if (!isOpen || !data) return null;

  const sortedMembers = [...data.members].sort((a, b) => a.rank - b.rank);
  const displayMembers = sortedMembers.slice(0, 10);
  const remainingCount = sortedMembers.length - 10;

  return (
    <FloatingPortal>
      <div 
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          backgroundColor: '#fff', 
          padding: '10px', 
          border: '1px solid #ccc',
          zIndex: 1000 
        }}
        {...getFloatingProps()}
      >
        <strong>{data.name}</strong><br />
        {displayMembers.map((member, index) => (
          <div key={index} style={{ marginTop: '5px' }}>
            <span
              className="character"
              style={{ color: getClassColor(member.character.playable_class.name) }}
            >
              {member.character.name}
              <span style={{ color: "gray" }}>-{member.character.realm.short_name}</span>
            </span>
          </div>
        ))}
        {remainingCount > 0 && (
          <div style={{ marginTop: '5px', color: 'gray' }}>
            {remainingCount} other {data.name}{remainingCount > 1 && "s"}
          </div>
        )}
      </div>
    </FloatingPortal>
  );
};

function ClassDistributionChart({ members }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const barRefs = useRef({});

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(5), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context);
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);
  const allClasses = [
    "Death Knight", "Demon Hunter", "Druid", "Evoker", "Hunter",
    "Mage", "Monk", "Paladin", "Priest", "Rogue", "Shaman",
    "Warlock", "Warrior"
  ];

  const classDistribution = allClasses
    .map(className => {
      const classMembers = members.filter(member => 
        member.character.playable_class.name === className
      );
      const classMedia = classMembers[0]?.character.playable_class.media;
      return {
        name: className,
        value: classMembers.length,
        members: classMembers,
        media: classMedia
      };
    })
    .filter(classData => classData.value > 0);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={classDistribution}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          tick={({ x, y, payload }) => (
            <g transform={`translate(${x},${y})`}>
              <PlayableClassIcon 
                className={payload.value} 
                size={16} 
                media={classDistribution.find(d => d.name === payload.value)?.media}
              />
            </g>
          )}
        />
        <YAxis />
        <Bar dataKey="value">
          {classDistribution.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={getClassColor(entry.name)}
              ref={(el) => {
                barRefs.current[index] = el;
                if (activeIndex === index) refs.setReference(el);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
        </Bar>
      </BarChart>
      <CustomTooltip 
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        data={activeIndex !== null ? classDistribution[activeIndex] : null}
        refs={refs}
        floatingStyles={floatingStyles}
        getFloatingProps={getFloatingProps}
      />
    </ResponsiveContainer>
  );
}

export default ClassDistributionChart;