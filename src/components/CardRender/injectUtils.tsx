import React from 'react';
// @ts-ignore
import { Mana } from '@saeris/react-mana';
import MechanicInterface from '../../interfaces/MechanicInterface';

interface InjectFunc {
  (
    text: (string | JSX.Element) | (string | JSX.Element)[],
    toReplace: RegExp,
    toInject: JSX.Element | string,
    toInjectClose?: JSX.Element | string,
    style?: InjectStyle
  ): (string | JSX.Element)[];
}

enum InjectStyle {
  NONE,
  ITALIC
}

interface InjectionConfig {
  toReplace: RegExp;
  toInject: JSX.Element | string;
  toInjectClose?: JSX.Element | string;
  style?: InjectStyle;
}

export const simpleReplaceAll = (target: string, toRemove: string, toInject: string) => {
  return target.split(toRemove).join(toInject);
};

const injectDomElement: InjectFunc = (
  text,
  toReplace,
  toInject,
  toInjectClose,
  style = InjectStyle.NONE
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

  return resultArray;
};

export const injectWithConfig = (
  text: (string | JSX.Element) | (string | JSX.Element)[],
  config: InjectionConfig | InjectionConfig[]
) => {
  let workingArray = text;

  if (!Array.isArray(config))
    return injectDomElement(
      workingArray,
      config.toReplace,
      config.toInject,
      config.toInjectClose,
      config.style
    );

  config.forEach(c => {
    workingArray = injectDomElement(
      workingArray,
      c.toReplace,
      c.toInject,
      c.toInjectClose,
      c.style
    );
  });

  return workingArray;
};

export const injectMechanics = (
  text: string | JSX.Element | (string | JSX.Element)[],
  mechanics: MechanicInterface[]
) => {
  const config: InjectionConfig[] = [];
  mechanics.forEach(mechanic => {
    config.push({
      toReplace: new RegExp(`[\\s]*\\[([\\s]*${mechanic.name}[\\s]*{.*}[\\s]*)\\]$`),
      style: InjectStyle.ITALIC,
      toInject: '',
      toInjectClose: ` (${mechanic.description})`
    });
    config.push({
      toReplace: new RegExp(`[\\s]*\\[([\\s]*${mechanic.name}[\\s]*\\d+[\\s]*)\\]$`),
      style: InjectStyle.ITALIC,
      toInject: '',
      toInjectClose: ` (${mechanic.description})`
    });
    config.push({
      toReplace: new RegExp(`[\\s]*\\[([\\s]*${mechanic.name}[\\s]*)\\]$`),
      style: InjectStyle.ITALIC,
      toInject: '',
      toInjectClose: ` (${mechanic.description})`
    });
    config.push({
      toReplace: new RegExp(`[\\s]*\\[[\\s]*${mechanic.name}[\\s]*(.*)\\]`),
      toInject: ` ${mechanic.name} — `,
      toInjectClose: ` ${mechanic.description}`
    });
  });
  return injectWithConfig(text, config);
};

export const injectManaIcons = (
  text: string | JSX.Element | (string | JSX.Element)[],
  shadow?: boolean
) => {
  const config: InjectionConfig[] = [
    { toReplace: /{[wW]}/, toInject: <Mana symbol="w" cost shadow={shadow} /> },
    { toReplace: /{[uU]}/, toInject: <Mana symbol="u" cost shadow={shadow} /> },
    { toReplace: /{[bB]}/, toInject: <Mana symbol="b" cost shadow={shadow} /> },
    { toReplace: /{[rR]}/, toInject: <Mana symbol="r" cost shadow={shadow} /> },
    { toReplace: /{[gG]}/, toInject: <Mana symbol="g" cost shadow={shadow} /> },
    { toReplace: /{[cC]}/, toInject: <Mana symbol="c" cost shadow={shadow} /> },
    { toReplace: /{[pP]}/, toInject: <Mana symbol="p" cost shadow={shadow} /> },
    {
      toReplace: /{[wW][pP]}|{[pP][wW]}/,
      toInject: <Mana symbol="wp" cost shadow={shadow} />
    },
    {
      toReplace: /{[uU][pP]}|{[pP][uU]}/,
      toInject: <Mana symbol="up" cost shadow={shadow} />
    },
    {
      toReplace: /{[bB][pP]}|{[pP][bB]}/,
      toInject: <Mana symbol="bp" cost shadow={shadow} />
    },
    {
      toReplace: /{[rR][pP]}|{[pP][rR]}/,
      toInject: <Mana symbol="rp" shadow={shadow} />
    },
    {
      toReplace: /{[gG][pP]}|{[pP][gG]}/,
      toInject: <Mana symbol="gp" cost shadow={shadow} />
    },
    {
      toReplace: /{2[wW]}|{[wW]2}/,
      toInject: <Mana symbol="2w" cost shadow={shadow} />
    },
    {
      toReplace: /{2[uU]}|{[uU]2}/,
      toInject: <Mana symbol="2u" cost shadow={shadow} />
    },
    {
      toReplace: /{2[bB]}|{[bB]2}/,
      toInject: <Mana symbol="2b" cost shadow={shadow} />
    },
    {
      toReplace: /{2[rR]}|{[rR]2}/,
      toInject: <Mana symbol="2r" cost shadow={shadow} />
    },
    {
      toReplace: /{2[gG]}|{[gG]2}/,
      toInject: <Mana symbol="2g" cost shadow={shadow} />
    },
    { toReplace: /{[sS]}/, toInject: <Mana symbol="s" cost shadow={shadow} /> },
    { toReplace: /{[xX]}/, toInject: <Mana symbol="x" cost shadow={shadow} /> },
    { toReplace: /{[yY]}/, toInject: <Mana symbol="y" cost shadow={shadow} /> },
    { toReplace: /{[zZ]}/, toInject: <Mana symbol="z" cost shadow={shadow} /> },
    {
      toReplace: /{[wW][uU]}|{[uU][wW]}/,
      toInject: <Mana symbol="wu" cost shadow={shadow} />
    },
    {
      toReplace: /{[wW][bB]}|{[bB][wW]}/,
      toInject: <Mana symbol="wb" cost shadow={shadow} />
    },
    {
      toReplace: /{[bB][uU]}|{[uU][bB]}/,
      toInject: <Mana symbol="ub" cost shadow={shadow} />
    },
    {
      toReplace: /{[rR][uU]}|{[uU][rR]}/,
      toInject: <Mana symbol="ur" cost shadow={shadow} />
    },
    {
      toReplace: /{[bB][rR]}|{[rR][bB]}/,
      toInject: <Mana symbol="br" cost shadow={shadow} />
    },
    {
      toReplace: /{[bB][gG]}|{[gG][bB]}/,
      toInject: <Mana symbol="bg" cost shadow={shadow} />
    },
    {
      toReplace: /{[rR][gG]}|{[gG][rR]}/,
      toInject: <Mana symbol="rg" cost shadow={shadow} />
    },
    {
      toReplace: /{[wW][rR]}|{[rR][wW]}/,
      toInject: <Mana symbol="rw" cost shadow={shadow} />
    },
    {
      toReplace: /{[wW][gG]}|{[gG][wW]}/,
      toInject: <Mana symbol="gw" cost shadow={shadow} />
    },
    {
      toReplace: /{[uU][gG]}|{[gG][uU]}/,
      toInject: <Mana symbol="gu" cost shadow={shadow} />
    },
    {
      toReplace: /{[tT]}/,
      toInject: <Mana symbol="tap" cost shadow={shadow} />
    },
    {
      toReplace: /{[uU][tT]}|{[tT][uU]}/,
      toInject: <Mana symbol="untap" cost shadow={shadow} />
    }
  ];

  for (let i = 0; i <= 20; i += 1) {
    config.push({
      toReplace: new RegExp(`\\{${i}\\}`),
      toInject: <Mana symbol={`${i}`} cost shadow={shadow} />
    });
  }

  return injectWithConfig(text, config);
};

export const injectPlaneswalkerIcons = (text: string | JSX.Element | (string | JSX.Element)[]) => {
  const config: InjectionConfig[] = [
    {
      toReplace: /{\+x}/,
      toInject: <i className="ms ms-loyalty-up ms-loyalty-x" />
    },
    {
      toReplace: /{-x}/,
      toInject: <i className="ms ms-loyalty-down ms-loyalty-x" />
    }
  ];

  for (let i = 0; i <= 20; i += 1) {
    config.push({
      toReplace: new RegExp(`{\\+${i}}`),
      toInject: <i className={`ms ms-loyalty-${i} ms-loyalty-up`} />
    });
    config.push({
      toReplace: new RegExp(`{\\-${i}}`),
      toInject: <i className={`ms ms-loyalty-${i} ms-loyalty-down`} />
    });
  }

  return injectWithConfig(text, config);
};

export const injectNewLine = (text: string | JSX.Element | (string | JSX.Element)[]) => {
  return injectWithConfig(text, {
    toReplace: /\|/,
    toInject: <span className="new-instruction" />
  });
};

export const injectName = (text: string | JSX.Element | (string | JSX.Element)[], name: string) => {
  return injectWithConfig(text, {
    toReplace: /~/,
    toInject: name
  });
};

export const injectQuotationMarks = (text: string | JSX.Element | (string | JSX.Element)[]) => {
  return injectWithConfig(text, {
    toReplace: /"(.*)"/,
    // toInject: '“”'
    toInject: '“',
    toInjectClose: '”'
  });
};

export const injectKeywords = (
  text: string | JSX.Element | (string | JSX.Element)[],
  keywords: string[]
) => {
  const config: InjectionConfig[] = [];
  keywords.forEach(word => {
    config.push({
      toReplace: new RegExp(`${word}`),
      toInject: 'italic',
      toInjectClose: word
    });
  });

  return injectWithConfig(text, config);
};
