import React from 'react';
import {
  EditOutlined,
  DownloadOutlined,
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  CloseCircleOutlined,
  CloseCircleTwoTone,
  QuestionCircleOutlined,
  LikeOutlined,
  LikeFilled,
  DislikeOutlined,
  DislikeFilled,
} from '@ant-design/icons';

type IconTheme = 'outlined' | 'filled' | 'twoTone';

/**
 * Compatibility shim for antd v3's string-based `<Icon type="..." theme="..." />`
 * API, which was removed in antd v4+. Maps the icon names used in this project
 * to their `@ant-design/icons` component equivalents.
 */
export interface AntIconProps {
  type: string;
  theme?: IconTheme;
  twoToneColor?: string;
  className?: string;
  style?: React.CSSProperties;
  spin?: boolean;
  onClick?: (event: React.MouseEvent<HTMLSpanElement>) => void;
}

type IconComponent = React.ComponentType<any>;

const ICONS: Record<string, Partial<Record<IconTheme, IconComponent>>> = {
  edit: { outlined: EditOutlined },
  download: { outlined: DownloadOutlined },
  swap: { outlined: SwapOutlined },
  plus: { outlined: PlusOutlined },
  reload: { outlined: ReloadOutlined },
  upload: { outlined: UploadOutlined },
  'close-circle': { outlined: CloseCircleOutlined, twoTone: CloseCircleTwoTone },
  'question-circle': { outlined: QuestionCircleOutlined },
  like: { outlined: LikeOutlined, filled: LikeFilled },
  dislike: { outlined: DislikeOutlined, filled: DislikeFilled },
};

const AntIcon: React.FC<AntIconProps> = ({ type, theme = 'outlined', twoToneColor, ...rest }) => {
  const variants = ICONS[type] || {};
  const Component = variants[theme] || variants.outlined || QuestionCircleOutlined;
  const extra = theme === 'twoTone' && twoToneColor ? { twoToneColor } : {};
  return <Component {...rest} {...extra} />;
};

export default AntIcon;
