import React, { useState, useRef } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, useHover, useFocus, useDismiss, useRole, useInteractions, FloatingPortal } from '@floating-ui/react';
import { getClassColor } from '../util';

function PlayableClassIcon({ className, size = 24, media }) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context, middlewareData } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(5), flip(), shift()],
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

  const iconElement = media ? (
    <img
      ref={refs.setReference}
      {...getReferenceProps()}
      src={media.assets[0].value}
      alt={className}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        borderRadius: '50%' 
      }}
    />
  ) : (
    <span 
      ref={refs.setReference}
      {...getReferenceProps()}
      style={{ 
        color: getClassColor(className),
        fontSize: size === 24 ? '1rem' : '0.8rem'
      }}
    >
      {className}
    </span>
  );

  return (
    <>
      {iconElement}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              color: getClassColor(className),
              backgroundColor: '#333',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            {...getFloatingProps()}
          >
            {className}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default PlayableClassIcon;