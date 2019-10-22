import React, { useRef } from 'react';
import { PDFExport } from '@progress/kendo-react-pdf';

import { message } from 'antd';

interface PdfDownloadWrapperInterface {
  fileName: string;
  render: (downloadPdf: () => void) => JSX.Element;
}

const PdfDownloadWrapper: React.FC<PdfDownloadWrapperInterface> = (
  props: PdfDownloadWrapperInterface
) => {
  const { fileName, render } = props;
  // const cardRef = useRef<PDFExport>(null);
  //
  // const downloadPdf = () => {
  //   if (cardRef.current) cardRef.current.save();
  // };
  //
  // return (
  //   <PDFExport
  //     paperSize="auto"
  //     fileName={`${fileName}.pdf`}
  //     title={fileName}
  //     creator="BJennWare"
  //     subject="Magic Fun Set Card"
  //     keywords="Magic, The Gathering, MTG, Fun, Set, Draft, Goomy"
  //     ref={cardRef}
  //   >
  //     {render(downloadPdf)}
  //   </PDFExport>
  // );

  const downloadPdf = () => {
    message.error('Currently not implemented :(');
  };

  return <div>{render(downloadPdf)}</div>;
};

export default PdfDownloadWrapper;
