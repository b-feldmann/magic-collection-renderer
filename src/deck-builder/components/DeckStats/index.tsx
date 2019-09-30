import React from 'react';
import { Row, Col, Typography } from 'antd';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts';
import DeckInterface from '../../DeckInterface';

import styles from './DeckStats.module.scss';
import SmallCardInterface from '../../SmallCardInterface';

interface DeckStatsProps {
  deck?: DeckInterface;
}

const { Title } = Typography;

const createChartData = (
  deck: DeckInterface,
  reducerKey: (card: SmallCardInterface) => string | string[] | undefined
): { name: string; count: number }[] => {
  const initial: { [key: string]: number } = {};
  const reduced: { [key: string]: number } = deck.cards.reduce((prev, current) => {
    const result = { ...prev };
    const tmp = reducerKey(current);
    if (tmp) {
      const keys: string[] = Array.isArray(tmp) ? tmp : [tmp];
      keys.forEach(key => {
        if (!result[key]) result[key] = 1;
        else result[key] += 1;
      });
    }

    return result;
  }, initial);

  // add commander
  const tmp = reducerKey(deck.commander);
  if (tmp) {
    const keys: string[] = Array.isArray(tmp) ? tmp : [tmp];
    keys.forEach(key => {
      if (!reduced[key]) reduced[key] = 1;
      else reduced[key] += 1;
    });
  }

  const data: { name: string; count: number }[] = Object.keys(reduced).map(name => ({
    name,
    count: reduced[name]
  }));

  return data;
};

const colorStringToNumber = (color: string) => {
  if (color === 'W') return 0;
  if (color === 'U') return 1;
  if (color === 'B') return 2;
  if (color === 'R') return 3;
  if (color === 'G') return 4;
  return 5;
};

const DeckStats = ({ deck }: DeckStatsProps) => {
  if (!deck) return <div />;

  const manaCurveData: { name: string; count: number }[] = createChartData(deck, card => {
    if (card.type_line && card.type_line.indexOf('Land') !== -1) return undefined;
    return card.cmc.toString();
  });

  const colorPieData = createChartData(deck, card => {
    if (!card.mana_cost) return '';
    return card.mana_cost
      .split('')
      .filter(c => c === 'W' || c === 'U' || c === 'B' || c === 'R' || c === 'G');
  }).sort((a, b) => colorStringToNumber(a.name) - colorStringToNumber(b.name));

  const colorProducePieData = createChartData(deck, card => {
    if (!card.oracle_text) return undefined;
    const matches = card.oracle_text.match(/Add\s({.{1,2}})+(\sor\s({.{1,2}})+)?/g);
    if (!matches) return undefined;
    return matches
      .reduce((prev, current) => prev + current.toString(), '')
      .split('')
      .filter(c => c === 'W' || c === 'U' || c === 'B' || c === 'R' || c === 'G');
  }).sort((a, b) => colorStringToNumber(a.name) - colorStringToNumber(b.name));

  const typePieData = createChartData(deck, card => {
    if (!card.type_line) return '';
    if (card.type_line.indexOf('Basic Land') !== -1) return 'Land';
    if (card.type_line.indexOf('—') !== -1)
      return card.type_line.substring(0, card.type_line.indexOf('—') - 1).replace('Legendary ', '');
    return card.type_line.replace('Legendary ', '');
  }).sort((a, b) => colorStringToNumber(a.name) - colorStringToNumber(b.name));

  const getColor = (color: string) => {
    if (color === 'W') return '#ffd666';
    if (color === 'U') return '#0088FE';
    if (color === 'B') return '#262626';
    if (color === 'R') return '#ad2102';
    if (color === 'G') return '#237804';
    return '#bfbfbf';
  };

  const getColorFromType = (type: string) => {
    if (type === 'Creature') return '#ffd666';
    if (type === 'Instant') return '#0088FE';
    if (type === 'Sorcery') return '#1d39c4';
    if (type === 'Land') return '#7cb305';
    if (type === 'Enchantment') return '#ad2102';
    if (type === 'Planeswalker') return '#237804';
    if (type === 'Artifact') return '#8c8c8c';
    return '#bfbfbf';
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    value
  }: {
    cx?: any;
    cy?: any;
    midAngle?: any;
    innerRadius?: any;
    outerRadius?: any;
    percent?: any;
    value?: any;
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {value}
      </text>
    );
  };

  return (
    <div className={styles.deckStats}>
      <AutoSizer>
        {({ height, width }) => {
          const chartWidth = Math.floor(width / 3);
          const chartHeight = Math.min(height, chartWidth);

          return (
            <Row style={{ width }}>
              <Col span={8}>
                <Title level={4}>Mana Curve</Title>
                <BarChart width={chartWidth} height={chartHeight} data={manaCurveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis interval={1} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#061178" maxBarSize={30} />
                </BarChart>
              </Col>
              <Col span={8}>
                <Title level={4}>Mana Cost / Mana Gain</Title>
                <PieChart width={chartWidth} height={chartHeight}>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={colorProducePieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    innerRadius={0}
                    outerRadius={chartHeight / 5}
                    legendType="none"
                  >
                    {colorProducePieData.map(entry => (
                      <Cell key={`inner-slice-${entry.name}`} fill={getColor(entry.name)} />
                    ))}
                  </Pie>
                  <Pie
                    data={colorPieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    innerRadius={chartHeight / 4}
                    outerRadius={(chartHeight / 8) * 3}
                  >
                    {colorPieData.map(entry => (
                      <Cell key={`outer-slice-${entry.name}`} fill={getColor(entry.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </Col>
              <Col span={8}>
                <Title level={4}>Card Type Distribution</Title>
                <PieChart width={chartWidth} height={chartHeight}>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={typePieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    label
                    innerRadius={0}
                    outerRadius={chartHeight / 4}
                  >
                    {typePieData.map(entry => (
                      <Cell
                        key={`type-outer-slice-${entry.name}`}
                        fill={getColorFromType(entry.name)}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </Col>
            </Row>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default DeckStats;
