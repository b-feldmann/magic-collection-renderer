import React from 'react';
import {Popover, Table} from 'antd';

import AntIcon from '../AntIcon/AntIcon';
// @ts-ignore
import {Mana} from '../Mana/Mana';

interface EditorTooltip {
    className: string;
}

const columns = [
    {
        title: 'Code',
        dataIndex: 'code',
        key: 'code',
    },
    {
        title: 'Icon',
        dataIndex: 'icon',
        key: 'icon',
    },
];

const dataSource: { key: number; code: string; icon: JSX.Element }[] = [];
const loyaltyDataSource: { key: number; code: string; icon: JSX.Element }[] = [];

const addToDataSource = (code: string, icon: JSX.Element) => {
    dataSource.push({key: dataSource.length + 1, code, icon});
};
const addToLoyaltyDataSource = (code: string, icon: JSX.Element) => {
    loyaltyDataSource.push({key: loyaltyDataSource.length + 1, code, icon});
};

addToDataSource('~', <span>Card Name</span>);
addToDataSource(
    '{w}{u}{b}{r}{g}{c}',
    <span>
    <Mana symbol="w" shadow/>
    <Mana symbol="u" shadow/>
    <Mana symbol="b" shadow/>
    <Mana symbol="r" shadow/>
    <Mana symbol="g" shadow/>
    <Mana symbol="c" shadow/>
  </span>,
);
addToDataSource(
    '{0} - {20}',
    <span>
    <Mana symbol="0" shadow/> –
    <Mana symbol="20" shadow/>
  </span>,
);
addToDataSource(
    '{t}{ut}',
    <span>
    <Mana symbol="tap" shadow/>
    <Mana symbol="untap" shadow/>
  </span>,
);
addToDataSource(
    '{wp}{up}{bp}{rp}{gp}{p}',
    <span>
    <Mana symbol="wp" cost shadow/>
    <Mana symbol="up" cost shadow/>
    <Mana symbol="bp" cost shadow/>
    <Mana symbol="rp" cost shadow/>
    <Mana symbol="gp" cost shadow/>
    <Mana symbol="p" cost shadow/>
  </span>,
);
addToDataSource(
    '{x}{y}{z}',
    <span>
    <Mana symbol="x" shadow/>
    <Mana symbol="y" shadow/>
    <Mana symbol="z" shadow/>
  </span>,
);
addToDataSource(
    '{2w}{2u}{2b}{2r}{2g}',
    <span>
    <Mana symbol="2w" cost shadow/>
    <Mana symbol="2u" cost shadow/>
    <Mana symbol="2b" cost shadow/>
    <Mana symbol="2r" cost shadow/>
    <Mana symbol="2g" cost shadow/>
  </span>,
);
addToDataSource(
    '{wu}{wb}{ub}{ur}{br}',
    <span>
    <Mana symbol="wu" cost shadow/>
    <Mana symbol="wb" cost shadow/>
    <Mana symbol="ub" cost shadow/>
    <Mana symbol="ur" cost shadow/>
    <Mana symbol="br" cost shadow/>
  </span>,
);
addToDataSource(
    '{bg}{rg}{rw}{gw}{gu}',
    <span>
    <Mana symbol="bg" cost shadow/>
    <Mana symbol="rg" cost shadow/>
    <Mana symbol="rw" cost shadow/>
    <Mana symbol="gw" cost shadow/>
    <Mana symbol="gu" cost shadow/>
  </span>,
);
addToLoyaltyDataSource(
    '{loy+5}{loy-5}{loy0}{loy5}',
    <span>
    <Mana symbol="loyalty-up" shadow loyalty={5}/>
    <Mana symbol="loyalty-down" shadow loyalty={5}/>
    <Mana symbol="loyalty-zero" shadow loyalty={0}/>
    <Mana symbol="loyalty-start" shadow loyalty={5}/>
  </span>,
);
addToLoyaltyDataSource(
    '{loy+x}{loy-x}{loyx}',
    <span>
    <Mana symbol="loyalty-up" shadow loyalty="X"/>
    <Mana symbol="loyalty-down" shadow loyalty="X"/>
    <Mana symbol="loyalty-start" shadow loyalty="X"/>
  </span>,
);

const content = (
    <Table
        dataSource={dataSource}
        columns={columns}
        size="small"
        showHeader={false}
        pagination={false}
        bordered
    />
);

const loyaltyContent = (
    <Table
        dataSource={loyaltyDataSource}
        columns={columns}
        size="small"
        showHeader={false}
        pagination={false}
        bordered
    />
);

const mechanicColumns = [
    {
        title: 'Code',
        dataIndex: 'code',
        key: 'code',
    },
    {
        title: 'Explanation',
        dataIndex: 'explanation',
        key: 'explanation',
    },
];

const mechanicDataSource: { key: number; code: string; explanation: string }[] = [];

const addMechanicToDataSource = (code: string, explanation: string) => {
    mechanicDataSource.push({key: mechanicDataSource.length + 1, code, explanation});
};

addMechanicToDataSource(
    '[-MECHANIC]',
    'Renders only the mechanic’s description as italic reminder text in parentheses. Neither the mechanic name nor a cost is shown.',
);
addMechanicToDataSource(
    '[MECHANIC {2}]',
    'Renders the mechanic name, the cost {2} and the mechanic’s description in parentheses. {2} is copied into the {ref} placeholder of the description. Any cost (number or mana symbols) works in place of {2}.',
);
addMechanicToDataSource(
    '[MECHANIC]',
    'Renders the mechanic name followed by its description in parentheses, with the {ref} placeholder removed from the description.',
);

const mechanicContent = (
    <Table
        dataSource={mechanicDataSource}
        columns={mechanicColumns}
        size="small"
        showHeader={false}
        pagination={false}
        bordered
    />
);

const EditorTooltip: React.FC<EditorTooltip> = (props) => (
    <Popover
        {...props}
        content={
            <div style={{maxWidth: 480}}>
                {content}
                <div style={{margin: '12px 0', borderTop: '1px solid #f0f0f0'}}/>
                <div style={{fontWeight: 600, marginBottom: 8}}>Loyalty</div>
                {loyaltyContent}
                <div style={{margin: '12px 0', borderTop: '1px solid #f0f0f0'}}/>
                <div style={{fontWeight: 600, marginBottom: 8}}>Mechanics</div>
                {mechanicContent}
            </div>
        }
        placement="left"
        title="Icon & Mechanic Codes"
    >
        <AntIcon type="question-circle"/>
    </Popover>
);

export default EditorTooltip;
