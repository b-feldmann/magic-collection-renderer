import React, { useState } from 'react';

import styles from './ImageLoader.module.scss';

interface ImageLoaderProps {
  src: string;
  lowResSrc?: string;
  className?: string;
  fallBackColor?: string;
  alt?: string;
  id?: string;
  restProps?: any[];
}

const ImageLoader = ({
  src,
  lowResSrc,
  className,
  fallBackColor,
  alt,
  id,
  ...restProps
}: ImageLoaderProps) => {
  const [loadedPlaceHolder, setLoadedPlaceHolder] = useState(false);
  const [loadedImage, setLoadedImage] = useState(false);

  return (
    <div>
      <div
        style={{ backgroundColor: fallBackColor }}
        className={`${className} ${
          loadedPlaceHolder || loadedImage ? styles.hidePlaceholder : styles.placeholder
        }`}
      />
      {lowResSrc && (
        <img
          src={lowResSrc}
          className={`${className} ${styles.lowResPlaceholder} ${
            loadedPlaceHolder ? styles.imgLoaded : styles.imgLoading
          } ${loadedImage && styles.hidePlaceholder}`}
          onLoad={() => setLoadedPlaceHolder(true)}
          alt={alt || ''}
          id={id}
          {...restProps}
        />
      )}
      {(!lowResSrc || loadedPlaceHolder) && (
        <img
          src={src}
          className={`${className} ${loadedImage ? styles.imgLoaded : styles.imgLoading}`}
          onLoad={() => setLoadedImage(true)}
          alt={alt || ''}
          id={id}
          {...restProps}
        />
      )}
    </div>
  );
};

export default ImageLoader;
