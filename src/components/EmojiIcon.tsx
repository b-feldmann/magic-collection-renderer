import { SmileOutlined } from '@ant-design/icons';

interface EmojiIconProps {
  size?: number;
}

const EmojiIcon = ({ size = 16 }: EmojiIconProps) => <SmileOutlined style={{ fontSize: size }} />;

export default EmojiIcon;
