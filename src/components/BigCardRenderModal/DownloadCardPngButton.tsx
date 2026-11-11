import React, { useContext, useTransition } from 'react';
import { Button } from 'antd';

import AntIcon from '../AntIcon/AntIcon';
import CardInterface from '../../interfaces/CardInterface';
import { MechanicsContext } from '../../store';
import { isLoadingCover } from '../../utils/cover';
import { staticAntd } from '../../utils/staticAntd';

interface DownloadCardPngButtonProps {
  card: CardInterface;
  collectionNumber: number;
  collectionSize: number;
  className?: string;
}

// Same file names as `npm run render:card`: lowercase, non-alphanumerics → '-'.
export const toPngFileName = (name: string, back = false) => {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'card';
  return `${slug}${back ? '-back' : ''}.png`;
};

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

// Renders every face of the card at its native 1500x2100 size and saves each
// as a PNG (double-faced cards also get `<name>-back.png`).
const DownloadCardPngButton = ({
  card,
  collectionNumber,
  collectionSize,
  className,
}: DownloadCardPngButtonProps) => {
  const mechanics = useContext(MechanicsContext);
  const [pending, startTransition] = useTransition();
  const coversLoading = isLoadingCover(card.front.cover) || isLoadingCover(card.back?.cover);

  const download = () =>
    startTransition(async () => {
      try {
        // The capture code is only needed once someone downloads.
        const { default: renderCardToPng } = await import('../../renderCard/renderCardToPng');
        const faces = card.back ? [card.front, { ...card.back, backFace: true }] : [card.front];
        for (const [index, face] of faces.entries()) {
          const blob = await renderCardToPng(
            {
              ...face,
              cardID: card.uuid,
              creator: card.creator.name,
              rarity: card.rarity,
              manaCost: card.manaCost,
              collectionNumber,
              collectionSize,
            },
            mechanics,
          );
          saveBlob(blob, toPngFileName(card.name, index === 1));
        }
      } catch (error) {
        console.error(error);
        staticAntd.message.error("Couldn't render the card image.");
      }
    });

  return (
    <Button
      className={className}
      size="small"
      icon={<AntIcon type="download" />}
      loading={pending}
      disabled={coversLoading}
      onClick={download}
    >
      Download PNG
    </Button>
  );
};

export default DownloadCardPngButton;
