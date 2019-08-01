import React, { useState } from 'react';

import styles from './ImageLoader.module.scss';

const ImageLoader = ({
  src,
  className,
  alt,
  id,
  ...restProps
}: {
  src: string;
  className?: string;
  alt?: string;
  id?: string;
  restProps?: any;
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={src}
      className={`${className} ${loaded ? styles.imgLoaded : styles.imgLoading}`}
      onLoad={() => setLoaded(true)}
      alt={alt}
      id={id}
      {...restProps}
    />
  );
};

export default ImageLoader;
