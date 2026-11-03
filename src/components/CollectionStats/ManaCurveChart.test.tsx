import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ManaCurveChart from './ManaCurveChart';
import { ManaCurvePoint } from './collectionStatsData';

const categories = [
  { key: 'white', label: 'White', color: '#c6b77a' },
  { key: 'blue', label: 'Blue', color: '#5683bf' },
];
const data: ManaCurvePoint[] = Array.from({ length: 8 }, (_, cmc) => ({
  cmc,
  white: cmc === 2 ? 2 : 0,
  blue: cmc === 2 ? 1 : 0,
}));

describe('ManaCurveChart', () => {
  it('shows aligned mana values, category counts and total stack counts', () => {
    render(
      <ManaCurveChart
        title="Color"
        data={data}
        categories={categories}
        maxCount={4}
        layout="stacked"
      />,
    );
    expect(screen.getByRole('img', { name: 'Mana curve by color: 3 cards' })).toBeInTheDocument();
    expect(screen.getByText('7+')).toBeInTheDocument();
    const bucket = screen.getByTitle('Mana value 2: 2 White, 1 Blue');
    expect(bucket).toHaveTextContent('2');
    expect(bucket).toHaveTextContent('1');
    expect(screen.getByLabelText('Total at mana value 2: 3 cards')).toBeInTheDocument();
  });

  it('uses the supplied shared scale instead of normalizing each single chart', () => {
    render(
      <>
        <ManaCurveChart
          title="White"
          data={data}
          categories={[categories[0]]}
          maxCount={4}
          layout="individual"
        />
        <ManaCurveChart
          title="Blue"
          data={data}
          categories={[categories[1]]}
          maxCount={4}
          layout="individual"
        />
      </>,
    );
    expect(screen.getByTitle('White: 2 cards at mana value 2')).toHaveStyle({ height: '50%' });
    expect(screen.getByTitle('Blue: 1 card at mana value 2')).toHaveStyle({ height: '25%' });
  });

  it('labels overlapping tag counts as tag matches and treats names as text', () => {
    render(
      <ManaCurveChart
        title="Tags"
        data={data}
        categories={[{ ...categories[0], label: '<script>Test</script>' }, categories[1]]}
        maxCount={4}
        layout="stacked"
        countUnit="tag matches"
      />,
    );
    expect(
      screen.getByRole('img', { name: 'Mana curve by tags: 3 tag matches' }),
    ).toBeInTheDocument();
    expect(screen.getByText('<script>Test</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('shows an explicit empty state without inventing tag categories', () => {
    render(
      <ManaCurveChart
        title="Tags"
        data={data}
        categories={[]}
        maxCount={1}
        layout="stacked"
        countUnit="tag matches"
      />,
    );
    expect(screen.getByText('No tagged nonland cards')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Mana curve by tags: 0 tag matches' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Tags legend' })).not.toBeInTheDocument();
  });

  it('keeps compact previews readable without losing accessible bucket counts', () => {
    render(
      <ManaCurveChart
        title="Color"
        data={data}
        categories={categories}
        maxCount={4}
        layout="stacked"
        compact
      />,
    );
    expect(screen.getByTitle('Mana value 2: 2 White, 1 Blue')).toBeInTheDocument();
    expect(screen.queryByLabelText('Total at mana value 2: 3 cards')).not.toBeInTheDocument();
  });
});
