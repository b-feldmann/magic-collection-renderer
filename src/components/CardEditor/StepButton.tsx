import React from 'react';
import { Button } from 'antd';

interface StepButtonProps {
  icon: React.ReactNode;
  /** The step the button changes, e.g. "Step 1". */
  step: string;
  /** What it does, e.g. "Move up". */
  action: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** A button in the header of a step. */
const StepButton = ({ icon, step, action, danger, disabled, onClick }: StepButtonProps) => (
  <Button
    type="text"
    size="small"
    danger={danger}
    icon={icon}
    aria-label={`${step}: ${action.charAt(0).toLowerCase()}${action.slice(1)}`}
    title={action}
    disabled={disabled}
    onClick={onClick}
  />
);

export default StepButton;
