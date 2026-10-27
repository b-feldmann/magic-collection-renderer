import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConfigProvider from 'antd/es/config-provider';
import Popover from 'antd/es/popover';
import type { TooltipRef } from 'antd/es/tooltip';
import AntIcon from '../AntIcon/AntIcon';
import SymbolGuide from './SymbolGuide';
import styles from './styles.module.scss';

interface EditorTooltipProps {
  className: string;
  children?: React.ReactNode;
}

const EditorTooltip = ({ className, children }: EditorTooltipProps) => {
  const { componentDisabled } = ConfigProvider.useConfig();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<TooltipRef>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const restoringFocus = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    // Restoring focus to a legacy focus-trigger must not immediately reopen it.
    restoringFocus.current = true;
    popoverRef.current?.nativeElement?.focus({ preventScroll: true });
    restoringFocus.current = false;
  }, []);

  useEffect(() => {
    if (!open || componentDisabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, componentDisabled, close]);

  const trigger = children || (
    <button
      type="button"
      className={styles.helpTrigger}
      aria-label="Symbol guide"
      disabled={componentDisabled}
    >
      <AntIcon type="question-circle" />
    </button>
  );

  const accessibleTrigger = React.isValidElement<React.HTMLAttributes<HTMLElement>>(trigger)
    ? React.cloneElement(trigger, {
        'aria-haspopup': 'dialog',
        'aria-expanded': open && !componentDisabled,
        onKeyDown: event => {
          trigger.props.onKeyDown?.(event);
          if (event.defaultPrevented || event.key !== 'Tab' || event.shiftKey || !open) return;
          const firstControl = contentRef.current?.querySelector<HTMLButtonElement>('button');
          if (firstControl) {
            // The body portal is outside the editor's normal tab sequence.
            event.preventDefault();
            firstControl.focus({ preventScroll: true });
          }
        },
        onBlurCapture: event => {
          trigger.props.onBlurCapture?.(event);
          // Keep the focus-triggered popover open when tabbing into its controls.
          if (contentRef.current?.contains(event.relatedTarget as Node)) event.stopPropagation();
        },
      })
    : trigger;

  return (
    <Popover
      ref={popoverRef}
      className={className}
      classNames={{ root: styles.popover }}
      styles={{ container: { padding: 0, borderRadius: 20, overflow: 'hidden' } }}
      trigger={children ? 'click' : ['hover', 'focus', 'click']}
      open={open && !componentDisabled}
      onOpenChange={nextOpen => {
        if (!componentDisabled && !restoringFocus.current) setOpen(nextOpen);
      }}
      content={
        <div ref={contentRef}>
          <SymbolGuide onClose={close} />
        </div>
      }
      placement="left"
      autoAdjustOverflow
    >
      {accessibleTrigger}
    </Popover>
  );
};

export default EditorTooltip;
