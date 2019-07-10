import React from 'react';

interface InjectFunc {
  (
    text: (string | JSX.Element) | (string | JSX.Element)[],
    toReplace: RegExp,
    toInject: JSX.Element | string
  ): (string | JSX.Element)[];
}

interface InjectionConfig {
  toReplace: RegExp;
  toInject: JSX.Element | string;
}

export const simpleReplaceAll = (
  target: string,
  toRemove: string,
  toInject: string
) => {
  return target.split(toRemove).join(toInject);
};

const injectDomElement: InjectFunc = (text, toReplace, toInject) => {
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
      const splitArray = elem.split(toReplace);
      for (let i = 0; i < splitArray.length - 1; i++) {
        resultArray.push(splitArray[i]);
        resultArray.push(toInject);
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
    return injectDomElement(workingArray, config.toReplace, config.toInject);

  config.forEach(c => {
    workingArray = injectDomElement(workingArray, c.toReplace, c.toInject);
  });

  return workingArray;
};

export const injectManaIcons = (
  text: string | JSX.Element | (string | JSX.Element)[]
) => {
  const config: InjectionConfig[] = [
    { toReplace: /{[wW]}/, toInject: <i className="ms ms-cost ms-w" /> },
    { toReplace: /{[bB]}/, toInject: <i className="ms ms-cost ms-b" /> },
    { toReplace: /{[uU]}/, toInject: <i className="ms ms-cost ms-u" /> },
    { toReplace: /{[rR]}/, toInject: <i className="ms ms-cost ms-r" /> },
    { toReplace: /{[gG]}/, toInject: <i className="ms ms-cost ms-g" /> },
    { toReplace: /{[cC]}/, toInject: <i className="ms ms-cost ms-c" /> },
    { toReplace: /{[pP]}/, toInject: <i className="ms ms-cost ms-p" /> },
    { toReplace: /{[sS]}/, toInject: <i className="ms ms-cost ms-s" /> },
    { toReplace: /{[xX]}/, toInject: <i className="ms ms-cost ms-x" /> },
    { toReplace: /{[tT]}/, toInject: <i className="ms ms-cost ms-tap" /> }
  ];

  for (let i = 0; i <= 20; i++) {
    config.push({
      toReplace: new RegExp(`{[${i}]}`),
      toInject: <i className={`ms ms-cost ms-${i}`} />
    });
  }

  return injectWithConfig(text, config);
};

export const injectPlaneswalkerIcons = (
  text: string | JSX.Element | (string | JSX.Element)[]
) => {
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

  for (let i = 0; i <= 20; i++) {
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

export const injectNewLine = (
  text: string | JSX.Element | (string | JSX.Element)[]
) => {
  return injectWithConfig(text, {
    toReplace: /\|/,
    toInject: <span className="new-instruction" />
  });
};

export const injectName = (
  text: string | JSX.Element | (string | JSX.Element)[],
  name: string
) => {
  return injectWithConfig(text, {
    toReplace: /~/,
    toInject: name
  });
};

export const injectQuotationMarks = (
  text: string | JSX.Element | (string | JSX.Element)[]
) => {
  return injectWithConfig(text, {
    toReplace: /"/,
    toInject: '“”'
  });
};
