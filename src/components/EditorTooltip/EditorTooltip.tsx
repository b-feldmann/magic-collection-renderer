import React from 'react';
import { Popover, Icon, Table } from 'antd';
// @ts-ignore
import { Mana } from '@saeris/react-mana';

interface EditorTooltip {
  className: string;
}

const columns = [
  {
    title: 'Code',
    dataIndex: 'code',
    key: 'code'
  },
  {
    title: 'Icon',
    dataIndex: 'icon',
    key: 'icon'
  }
];

const dataSource: { key: number; code: string; icon: JSX.Element }[] = [];

const addToDataSource = (code: string, icon: JSX.Element) => {
  dataSource.push({ key: dataSource.length + 1, code, icon });
};

addToDataSource(
  '{w}{u}{b}{r}{g}{c}',
  <span>
    <Mana symbol="w" shadow />
    <Mana symbol="u" shadow />
    <Mana symbol="b" shadow />
    <Mana symbol="r" shadow />
    <Mana symbol="g" shadow />
    <Mana symbol="c" shadow />
  </span>
);
addToDataSource(
  '{0} - {20}',
  <span>
    <Mana symbol="0" shadow /> – <Mana symbol="20" shadow />
  </span>
);
addToDataSource(
  '{t}{ut}',
  <span>
    <Mana symbol="tap" shadow />
    <Mana symbol="untap" shadow />
  </span>
);
addToDataSource(
  '{wp}{up}{bp}{rp}{gp}{p}',
  <span>
    <Mana symbol="wp" shadow />
    <Mana symbol="up" shadow />
    <Mana symbol="bp" shadow />
    <Mana symbol="rp" shadow />
    <Mana symbol="gp" shadow />
    <Mana symbol="p" shadow />
  </span>
);
addToDataSource(
  '{x}{y}{z}',
  <span>
    <Mana symbol="x" shadow />
    <Mana symbol="y" shadow />
    <Mana symbol="z" shadow />
  </span>
);
addToDataSource(
  '{2w}{2u}{2b}{2r}{2g}',
  <span>
    <Mana symbol="2w" shadow />
    <Mana symbol="2u" shadow />
    <Mana symbol="2b" shadow />
    <Mana symbol="2r" shadow />
    <Mana symbol="2g" shadow />
  </span>
);
addToDataSource(
  '{wu}{wb}{ub}{ur}{br}',
  <span>
    <Mana symbol="wu" shadow />
    <Mana symbol="wb" shadow />
    <Mana symbol="ub" shadow />
    <Mana symbol="ur" shadow />
    <Mana symbol="br" shadow />
  </span>
);
addToDataSource(
  '{bg}{rg}{rw}{gw}{gu}',
  <span>
    <Mana symbol="bg" shadow />
    <Mana symbol="rg" shadow />
    <Mana symbol="rw" shadow />
    <Mana symbol="gw" shadow />
    <Mana symbol="gu" shadow />
  </span>
);
addToDataSource(
  '{loy+5}{loy-5}{loy0}{loy5}',
  <span>
    <Mana symbol="loyalty-up" shadow loyalty={5} />
    <Mana symbol="loyalty-down" shadow loyalty={5} />
    <Mana symbol="loyalty-zero" shadow loyalty={0} />
    <Mana symbol="loyalty-start" shadow loyalty={5} />
  </span>
);
addToDataSource(
  '{loy+x}{loy-x}{loyx}',
  <span>
    <Mana symbol="loyalty-up" shadow loyalty="X" />
    <Mana symbol="loyalty-down" shadow loyalty="X" />
    <Mana symbol="loyalty-start" shadow loyalty="X" />
  </span>
);

const content = (
  <Table
    dataSource={dataSource}
    columns={columns}
    size="small"
    showHeader={false}
    pagination={false}
    bordered={true}
  />
);

const EditorTooltip: React.FC<EditorTooltip> = props => (
  <Popover
    {...props}
    content={content}
    placement="leftBottom"
    title="Icon Codes"
  >
    <Icon type="question-circle" />
  </Popover>
);

export default EditorTooltip;
