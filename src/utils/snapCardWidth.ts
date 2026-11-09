// The card's aspect ratio is 5:7 (CARD_WIDTH x CARD_HEIGHT), so a width of a
// multiple of 5 device pixels gives whole device pixels for the height, too.
const PIXEL_STEP = 5;

/**
 * Rounds a card width down so both card edges land on the device pixel grid.
 * Fractional sizes make the browser blend every edge with its neighbours,
 * which renders the card blurry.
 */
const snapCardWidth = (width: number, devicePixelRatio = window.devicePixelRatio || 1): number =>
  Math.max(0, Math.floor((width * devicePixelRatio) / PIXEL_STEP) * PIXEL_STEP) / devicePixelRatio;

export default snapCardWidth;
