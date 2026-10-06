import { CoverFit } from '../../interfaces/enums';

// Maps the per-face cover-fit setting to its CSS-module class. Defaults to
// Zoom so cards without the setting preserve the cover image's aspect ratio.
const getCoverFitClass = (styleClasses: { [key: string]: string }, coverFit?: CoverFit): string =>
  coverFit === CoverFit.Stretch ? styleClasses.coverStretch : styleClasses.coverZoom;

export default getCoverFitClass;
