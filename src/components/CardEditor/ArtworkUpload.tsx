import React, { useId } from 'react';
import { Button, Upload } from 'antd';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import resizeImage from '../../utils/resizeImage';
import styles from './styles.module.scss';

interface ArtworkUploadProps {
  onChange: (value: string) => void;
}

const ArtworkUpload = ({ onChange }: ArtworkUploadProps) => {
  const titleId = useId();

  return (
    <div className={styles.artworkUpload} role="group" aria-labelledby={titleId}>
      <span className={styles.artworkUploadIcon} aria-hidden="true">
        <UploadOutlined />
      </span>
      <div className={styles.artworkUploadMessage}>
        <strong id={titleId}>Give your card a world</strong>
        <p>Upload artwork or paste a URL below</p>
      </div>
      <Upload
        showUploadList={false}
        beforeUpload={(file: File) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            // Preserve the filename in the card value; persistence uploads the
            // resized image through the existing middleware action.
            if (typeof reader.result === 'string') {
              resizeImage(reader.result, image => onChange(`base64:${file.name}|${image}`));
            } else {
              onChange(`base64:${file.name}|${reader.result}`);
            }
          };
          // Keep file processing local; the card's normal autosave persists it.
          return false;
        }}
      >
        <Button size="small">Choose file</Button>
      </Upload>
    </div>
  );
};

export default ArtworkUpload;
