import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import EditField from './EditField';

const Harness = ({ initialValue = '7/7', name = 'Power/Toughness' }) => {
  const [stats, setStats] = useState(initialValue);
  return (
    <>
      <EditField
        fieldKey="cardStats"
        type="split-input"
        name={name}
        getValue={() => stats}
        saveValue={(_key, value) => setStats(value)}
      />
      <output aria-label="Saved stats">{stats}</output>
    </>
  );
};

describe('EditField power/toughness', () => {
  it('uses two individually labeled fields without a slash input between them', () => {
    render(<Harness initialValue="2/3" />);
    const group = screen.getByRole('group', { name: 'Power / Toughness' });
    const power = within(group).getByRole('textbox', { name: 'Power' }) as HTMLInputElement;
    const toughness = within(group).getByRole('textbox', { name: 'Toughness' }) as HTMLInputElement;
    expect(group.querySelectorAll('input')).toHaveLength(2);
    expect(power.labels).toHaveLength(1);
    expect(toughness.labels).toHaveLength(1);
    expect(power.labels![0]).toHaveTextContent('Power');
    expect(toughness.labels![0]).toHaveTextContent('Toughness');
    expect(power.id).not.toBe(toughness.id);
  });

  it('keeps label associations unique when main and level stats render together', () => {
    render(
      <>
        <Harness initialValue="2/3" />
        <Harness initialValue="4/5" />
      </>,
    );
    const powers = screen.getAllByRole('textbox', { name: 'Power' }) as HTMLInputElement[];
    expect(powers[0].id).not.toBe(powers[1].id);
    expect(powers[0].labels).toHaveLength(1);
    expect(powers[1].labels).toHaveLength(1);
  });

  it('groups separately named inputs and preserves the other stat when editing', () => {
    render(<Harness />);

    const group = screen.getByRole('group', { name: 'Power / Toughness' });
    const power = within(group).getByRole('textbox', { name: 'Power' });
    const toughness = within(group).getByRole('textbox', { name: 'Toughness' });
    expect(power).toHaveValue('7');
    expect(toughness).toHaveValue('7');

    fireEvent.change(power, { target: { value: '*' } });
    expect(screen.getByLabelText('Saved stats')).toHaveTextContent('*/7');
    fireEvent.change(toughness, { target: { value: '1+*' } });
    expect(screen.getByLabelText('Saved stats')).toHaveTextContent('*/1+*');
    fireEvent.change(power, { target: { value: '' } });
    expect(screen.getByLabelText('Saved stats')).toHaveTextContent('/1+*');
  });

  it('supports empty level stats with distinct accessible names', () => {
    render(<Harness initialValue="" name="Power/Toughness" />);

    const power = screen.getByRole('textbox', { name: 'Power' });
    const toughness = screen.getByRole('textbox', { name: 'Toughness' });
    expect(power).toHaveValue('');
    expect(toughness).toHaveValue('');
    fireEvent.change(toughness, { target: { value: '0' } });
    expect(screen.getByLabelText('Saved stats')).toHaveTextContent('/0');
  });
});
