import React from 'react';
// @ts-ignore
import { Mana } from '../components/Mana/Mana';
import MechanicInterface from '../interfaces/MechanicInterface';

export const injectForText = (line: string, cardName: string, mechanics: MechanicInterface[]) => {
  return injectQuotationMarks(
    injectManaIcons(
      injectName(injectMechanics(injectLongDash(line), mechanics, cardName), cardName),
    ),
  );
};

export const injectForFlavour = (line: string, cardName: string) => {
  return injectQuotationMarks(injectName(line, cardName));
};

interface InjectFunc {
  (
    text: (string | JSX.Element) | (string | JSX.Element)[],
    toReplace: RegExp,
    toInject: JSX.Element | string,
    toInjectClose?: JSX.Element | string,
    style?: InjectStyle,
  ): (string | JSX.Element)[];
}

enum InjectStyle {
  NONE,
  ITALIC,
}

// React requires a unique key on every element that is rendered as part of an
// array (including arrays nested inside other elements' children). The inject
// helpers build arrays of mixed strings/JSX elements, so key them recursively
// before rendering.
type InjectValue = string | JSX.Element | InjectValue[];

const injectKeys = (value: InjectValue | InjectValue[]): InjectValue | InjectValue[] => {
  if (!Array.isArray(value)) return value;

  return value.map((elem, index) => {
    if (Array.isArray(elem)) {
      return injectKeys(elem);
    }
    if (React.isValidElement(elem)) {
      const { children } = elem.props as { children?: InjectValue | InjectValue[] };
      if (Array.isArray(children)) {
        return React.cloneElement(
          elem,
          { key: String(index) },
          injectKeys(children) as JSX.Element,
        );
      }
      return React.cloneElement(elem, { key: String(index) });
    }
    return elem;
  });
};

interface InjectionConfig {
  toReplace: RegExp;
  toInject: JSX.Element | string;
  toInjectClose?: JSX.Element | string;
  style?: InjectStyle;
}

const injectDomElement: InjectFunc = (
  text,
  toReplace,
  toInject,
  toInjectClose,
  style = InjectStyle.NONE,
) => {
  const workingArray: (string | JSX.Element)[] = [];
  if (Array.isArray(text)) {
    text.forEach(t => workingArray.push(t));
  } else {
    workingArray.push(text);
  }

  const resultArray: (string | JSX.Element)[] = [];

  workingArray.forEach(elem => {
    if (React.isValidElement(elem)) {
      resultArray.push(elem);
      return;
    }

    if (typeof elem === 'string') {
      const wrap = (obj: string | JSX.Element) => {
        if (style === InjectStyle.ITALIC) {
          return <span style={{ fontStyle: 'italic' }}>{obj}</span>;
        }
        return obj;
      };

      const splitArray = elem.split(toReplace);
      for (let i = 0; i < splitArray.length - 1; i += 1) {
        resultArray.push(splitArray[i]);
        if (toInjectClose && i % 2 === 1) {
          resultArray.push(wrap(toInjectClose));
        } else {
          resultArray.push(wrap(toInject));
        }
      }

      resultArray.push(splitArray[splitArray.length - 1]);
    }
  });

  return injectKeys(resultArray) as (string | JSX.Element)[];
};

export const injectWithConfig = (
  text: (string | JSX.Element) | (string | JSX.Element)[],
  config: InjectionConfig | InjectionConfig[],
) => {
  let workingArray = text;

  if (!Array.isArray(config))
    return injectDomElement(
      workingArray,
      config.toReplace,
      config.toInject,
      config.toInjectClose,
      config.style,
    );

  config.forEach(c => {
    workingArray = injectDomElement(
      workingArray,
      c.toReplace,
      c.toInject,
      c.toInjectClose,
      c.style,
    );
  });

  return workingArray;
};

/**
 * Static regex/symbol table for mana icons. The `toReplace` patterns never
 * change, so they are allocated once at module load instead of on every call
 * (this function runs for every card-text line on every render). Only the
 * injected `<Mana>` element depends on the per-call `shadow` flag, so the JSX
 * is built lazily in `injectManaIcons`.
 */
interface ManaSymbolConfig {
  toReplace: RegExp;
  symbol: string;
  cost: boolean;
}

const MANA_SYMBOL_CONFIG: ManaSymbolConfig[] = [
  { toReplace: /{[wW]}/, symbol: 'w', cost: true },
  { toReplace: /{[uU]}/, symbol: 'u', cost: true },
  { toReplace: /{[bB]}/, symbol: 'b', cost: true },
  { toReplace: /{[rR]}/, symbol: 'r', cost: true },
  { toReplace: /{[gG]}/, symbol: 'g', cost: true },
  { toReplace: /{[cC]}/, symbol: 'c', cost: true },
  { toReplace: /{[pP]}/, symbol: 'p', cost: true },
  { toReplace: /{[wW][pP]}|{[pP][wW]}/, symbol: 'wp', cost: true },
  { toReplace: /{[uU][pP]}|{[pP][uU]}/, symbol: 'up', cost: true },
  { toReplace: /{[bB][pP]}|{[pP][bB]}/, symbol: 'bp', cost: true },
  { toReplace: /{[rR][pP]}|{[pP][rR]}/, symbol: 'rp', cost: false },
  { toReplace: /{[gG][pP]}|{[pP][gG]}/, symbol: 'gp', cost: true },
  { toReplace: /{2[wW]}|{[wW]2}/, symbol: '2w', cost: true },
  { toReplace: /{2[uU]}|{[uU]2}/, symbol: '2u', cost: true },
  { toReplace: /{2[bB]}|{[bB]2}/, symbol: '2b', cost: true },
  { toReplace: /{2[rR]}|{[rR]2}/, symbol: '2r', cost: true },
  { toReplace: /{2[gG]}|{[gG]2}/, symbol: '2g', cost: true },
  { toReplace: /{[sS]}/, symbol: 's', cost: true },
  { toReplace: /{[xX]}/, symbol: 'x', cost: true },
  { toReplace: /{[yY]}/, symbol: 'y', cost: true },
  { toReplace: /{[zZ]}/, symbol: 'z', cost: true },
  { toReplace: /{[wW][uU]}|{[uU][wW]}/, symbol: 'wu', cost: true },
  { toReplace: /{[wW][bB]}|{[bB][wW]}/, symbol: 'wb', cost: true },
  { toReplace: /{[bB][uU]}|{[uU][bB]}/, symbol: 'ub', cost: true },
  { toReplace: /{[rR][uU]}|{[uU][rR]}/, symbol: 'ur', cost: true },
  { toReplace: /{[bB][rR]}|{[rR][bB]}/, symbol: 'br', cost: true },
  { toReplace: /{[bB][gG]}|{[gG][bB]}/, symbol: 'bg', cost: true },
  { toReplace: /{[rR][gG]}|{[gG][rR]}/, symbol: 'rg', cost: true },
  { toReplace: /{[wW][rR]}|{[rR][wW]}/, symbol: 'rw', cost: true },
  { toReplace: /{[wW][gG]}|{[gG][wW]}/, symbol: 'gw', cost: true },
  { toReplace: /{[uU][gG]}|{[gG][uU]}/, symbol: 'gu', cost: true },
  { toReplace: /{[tT]}/, symbol: 'tap', cost: true },
  { toReplace: /{[uU][tT]}|{[tT][uU]}/, symbol: 'untap', cost: true },
  ...Array.from({ length: 21 }, (_unused, i) => ({
    toReplace: new RegExp(`\\{${i}\\}`),
    symbol: `${i}`,
    cost: true,
  })),
];

export const injectManaIcons = (
  text: string | JSX.Element | (string | JSX.Element)[],
  shadow?: boolean,
) => {
  const config: InjectionConfig[] = MANA_SYMBOL_CONFIG.map(({ toReplace, symbol, cost }) => ({
    toReplace,
    toInject: <Mana symbol={symbol} cost={cost} shadow={shadow} />,
  }));

  return injectWithConfig(text, config);
};

/**
 * Planeswalker loyalty icons never depend on any argument, so the entire
 * config (regexes and JSX) is allocated once at module load.
 */
const PLANESWALKER_ICON_CONFIG: InjectionConfig[] = [
  {
    toReplace: /{\+x}/,
    toInject: <i className="ms ms-loyalty-up ms-loyalty-x" />,
  },
  {
    toReplace: /{-x}/,
    toInject: <i className="ms ms-loyalty-down ms-loyalty-x" />,
  },
  ...Array.from({ length: 21 }).flatMap((_unused, i) => [
    {
      toReplace: new RegExp(`{\\+${i}}`),
      toInject: <i className={`ms ms-loyalty-${i} ms-loyalty-up`} />,
    },
    {
      toReplace: new RegExp(`{\\-${i}}`),
      toInject: <i className={`ms ms-loyalty-${i} ms-loyalty-down`} />,
    },
  ]),
];

export const injectPlaneswalkerIcons = (text: string | JSX.Element | (string | JSX.Element)[]) => {
  return injectWithConfig(text, PLANESWALKER_ICON_CONFIG);
};

export const injectName = (text: string | JSX.Element | (string | JSX.Element)[], name: string) => {
  return injectWithConfig(text, {
    toReplace: /~/,
    toInject: name,
  });
};

export const injectQuotationMarks = (text: string | JSX.Element | (string | JSX.Element)[]) => {
  return injectWithConfig(text, {
    toReplace: /"(.*)"/,
    // toInject: '“”'
    toInject: '“',
    toInjectClose: '”',
  });
};

export const injectLongDash = (text: string | JSX.Element | (string | JSX.Element)[]) => {
  return injectWithConfig(text, {
    toReplace: /--/,
    toInject: '—',
  });
};

export const injectMechanics = (
  text: string | JSX.Element | (string | JSX.Element)[],
  mechanics: MechanicInterface[],
  cardName = '',
) => {
  const arr: (string | JSX.Element)[] = Array.isArray(text) ? text : [text];

  const result: (string | JSX.Element)[] = [];
  arr.forEach(elem => {
    if (typeof elem !== 'string') {
      result.push(elem);
      return;
    }

    const lines = elem.split(/(\[.*\])/).filter(line => line.length > 0 && !line.match(/^\s*$/));
    lines.forEach((line, i) => {
      if (line.indexOf('[') === -1 || line.indexOf(']') === -1) {
        result.push(line);
        return;
      }
      const usedMechanic = mechanics.find(
        mechanic => line.indexOf(mechanic.name) !== -1 && !mechanic.name.match(/^\s*$/),
      );
      if (!usedMechanic) {
        result.push(line);
        return;
      }
      const cleanedLine = line.replace(usedMechanic.name, '').replace(/\[|\]|\s*/g, '');
      if (cleanedLine === '-') {
        result.push(<span style={{ fontStyle: 'italic' }}>{`(${usedMechanic.description})`}</span>);
        return;
      }
      const braces = i === lines.length - 1 && !!cleanedLine.match(/^\d{0,2}$|^(\{.{1,2}\})+$/);
      const injectedRef = usedMechanic.description.replace(/\{ref\}/g, cleanedLine);
      const parsedDescription = injectManaIcons(
        injectQuotationMarks(injectName(injectedRef, cardName)),
      );
      if (braces) {
        result.push(`${usedMechanic.name} ${cleanedLine} (`);
        result.push(<span style={{ fontStyle: 'italic' }}>{parsedDescription}</span>);
        result.push(')');
      } else {
        result.push(`${usedMechanic.name} — ${cleanedLine} `);
        result.push(<span>{parsedDescription}</span>);
      }
    });
  });

  return injectKeys(result) as (string | JSX.Element)[];
};
