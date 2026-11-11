import React, { useContext, useRef, useState } from 'react';
import Button from 'antd/es/button';
import Modal from 'antd/es/modal';
import Progress from 'antd/es/progress';

import CardInterface from '../../interfaces/CardInterface';
import { MechanicsContext } from '../../store';
import saveBlob from '../../utils/saveBlob';
import { staticAntd } from '../../utils/staticAntd';
import type { PdfProgress } from '../../renderCard/collectionToPdf';

export const PDF_FILE_NAME = 'magic-collection.pdf';
// The app's green (Create card button, active tab); antd's Progress would
// otherwise use its blue info color.
const PROGRESS_COLOR = '#3e6248';

// Starts the print-sheet PDF export of a list of cards and tracks its progress.
export const useCollectionPdfExport = () => {
  const mechanics = useContext(MechanicsContext);
  const [progress, setProgress] = useState<PdfProgress | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // `numberedIn` is the list the card view takes collector numbers from.
  const start = async (cards: CardInterface[], numberedIn: CardInterface[] = cards) => {
    if (controllerRef.current) return;
    if (!cards.length) {
      staticAntd.message.info('There are no cards to export.');
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setProgress({ done: 0, total: cards.length });
    try {
      // jsPDF and the capture code are only needed once someone exports.
      const { default: collectionToPdf } = await import('../../renderCard/collectionToPdf');
      const blob = await collectionToPdf(cards, mechanics, {
        numberedIn,
        onProgress: setProgress,
        signal: controller.signal,
      });
      saveBlob(blob, PDF_FILE_NAME);
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        staticAntd.message.error("Couldn't create the PDF.");
      }
    } finally {
      controllerRef.current = null;
      setProgress(null);
    }
  };

  const cancel = () => controllerRef.current?.abort();

  return { start, cancel, progress };
};

interface CollectionPdfProgressProps {
  progress: PdfProgress | null;
  onCancel: () => void;
}

export const CollectionPdfProgress = ({ progress, onCancel }: CollectionPdfProgressProps) => (
  <Modal
    open={progress !== null}
    title="Creating PDF"
    closable={false}
    mask={{ closable: false }}
    keyboard={false}
    footer={<Button onClick={onCancel}>Cancel</Button>}
  >
    {progress && (
      <>
        <p>
          Rendering card {Math.min(progress.done + 1, progress.total)} of {progress.total}…
        </p>
        <Progress
          strokeColor={PROGRESS_COLOR}
          percent={Math.round((progress.done / progress.total) * 100)}
          aria-label="PDF export progress"
        />
      </>
    )}
  </Modal>
);
