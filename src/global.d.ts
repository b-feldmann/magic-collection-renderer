import type * as React from 'react';

// React 19 + @types/react 19 removed the global `JSX` namespace in favour of
// `React.JSX`. This project still references `JSX.Element` in several places,
// so we re-expose the namespace globally to avoid touching every file.
declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}
