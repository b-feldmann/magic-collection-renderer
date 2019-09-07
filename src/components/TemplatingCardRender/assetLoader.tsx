import ArtifactMainframe from './images/mainframes/Art.png';
import ColorlessMainframe from './images/mainframes/Art.png';
import WhiteMainframe from './images/mainframes/W.png';
import BlueMainframe from './images/mainframes/U.png';
import BlackMainframe from './images/mainframes/B.png';
import RedMainframe from './images/mainframes/R.png';
import GreenMainframe from './images/mainframes/G.png';
import GoldMainframe from './images/mainframes/Gld.png';

import LowResWhiteMainframe from './images/mainframes/lowRes/W.png';
import LowResBlueMainframe from './images/mainframes/lowRes/U.png';
import LowResBlackMainframe from './images/mainframes/lowRes/B.png';
import LowResRedMainframe from './images/mainframes/lowRes/R.png';
import LowResGreenMainframe from './images/mainframes/lowRes/G.png';
import LowResGoldMainframe from './images/mainframes/lowRes/Gld.png';
import LowResColorlessMainframe from './images/mainframes/lowRes/Art.png';

import BasicLandWhiteMainframe from './images/mainframes/lands/W.png';
import BasicLandBlueMainframe from './images/mainframes/lands/U.png';
import BasicLandBlackMainframe from './images/mainframes/lands/B.png';
import BasicLandRedMainframe from './images/mainframes/lands/R.png';
import BasicLandGreenMainframe from './images/mainframes/lands/G.png';
import BasicLandGoldMainframe from './images/mainframes/lands/Gld.png';
import LandColorlessMainframe from './images/mainframes/lands/C.png';

import WhiteInnerBorder from './images/borders/W.png';
import BlueInnerBorder from './images/borders/U.png';
import BlackInnerBorder from './images/borders/B.png';
import RedInnerBorder from './images/borders/R.png';
import GreenInnerBorder from './images/borders/G.png';
import BlackGreenInnerBorder from './images/borders/BG.png';
import BlackRedInnerBorder from './images/borders/BR.png';
import GreenBlueInnerBorder from './images/borders/GU.png';
import GreenWhiteInnerBorder from './images/borders/GW.png';
import RedGreenInnerBorder from './images/borders/RG.png';
import RedWhiteInnerBorder from './images/borders/RW.png';
import BlueBlackInnerBorder from './images/borders/UB.png';
import BlueRedInnerBorder from './images/borders/UR.png';
import WhiteBlackInnerBorder from './images/borders/WB.png';
import WhiteBlueInnerBorder from './images/borders/WU.png';
import GoldInnerBorder from './images/borders/Gld.png';

import LandOverlay from './images/overlay/C-overlay.png';

import MythicRareIcon from '../CardRender/images/rarity/mythic.png';
import RareIcon from '../CardRender/images/rarity/rare.png';
import UncommonIcon from '../CardRender/images/rarity/uncommon.png';
import CommonIcon from '../CardRender/images/rarity/common.png';

import {BasicLandType, ColorType, RarityType} from '../../interfaces/enums';

export const getColorMainframe = (color: ColorType) => {
  switch (color) {
    case ColorType.White:
      return WhiteMainframe;
    case ColorType.Blue:
      return BlueMainframe;
    case ColorType.Black:
      return BlackMainframe;
    case ColorType.Red:
      return RedMainframe;
    case ColorType.Green:
      return GreenMainframe;
    case ColorType.Gold:
      return GoldMainframe;
    default:
      return ColorlessMainframe;
  }
};

export const getLowResColorMainframe = (color: ColorType) => {
  switch (color) {
    case ColorType.White:
      return LowResWhiteMainframe;
    case ColorType.Blue:
      return LowResBlueMainframe;
    case ColorType.Black:
      return LowResBlackMainframe;
    case ColorType.Red:
      return LowResRedMainframe;
    case ColorType.Green:
      return LowResGreenMainframe;
    case ColorType.Gold:
      return LowResGoldMainframe;
    case ColorType.Colorless:
      return LowResColorlessMainframe;
    default:
      return undefined;
  }
};

export const getInnerBorderFrame = (colors: ColorType[]) => {
  if (colors.length > 2) return GoldInnerBorder;

  if (colors.length === 1) {
    if (colors[0] === ColorType.White) return WhiteInnerBorder;
    if (colors[0] === ColorType.Blue) return BlueInnerBorder;
    if (colors[0] === ColorType.Black) return BlackInnerBorder;
    if (colors[0] === ColorType.Red) return RedInnerBorder;
    if (colors[0] === ColorType.Green) return GreenInnerBorder;
  }

  if (colors.includes(ColorType.White)) {
    if (colors.includes(ColorType.Blue)) return WhiteBlueInnerBorder;
    if (colors.includes(ColorType.Black)) return WhiteBlackInnerBorder;
  }
  if (colors.includes(ColorType.Blue)) {
    if (colors.includes(ColorType.Black)) return BlueBlackInnerBorder;
    if (colors.includes(ColorType.Red)) return BlueRedInnerBorder;
  }
  if (colors.includes(ColorType.Black)) {
    if (colors.includes(ColorType.Green)) return BlackGreenInnerBorder;
    if (colors.includes(ColorType.Red)) return BlackRedInnerBorder;
  }
  if (colors.includes(ColorType.Red)) {
    if (colors.includes(ColorType.Green)) return RedGreenInnerBorder;
    if (colors.includes(ColorType.White)) return RedWhiteInnerBorder;
  }
  if (colors.includes(ColorType.Green)) {
    if (colors.includes(ColorType.Blue)) return GreenBlueInnerBorder;
    if (colors.includes(ColorType.White)) return GreenWhiteInnerBorder;
  }
  return '';
};

export const getLandOverlay = () => LandOverlay;

export const getArtifactMainframe = () => ArtifactMainframe;

export const getLandMainframe = () => LandColorlessMainframe;

export const getBasicLandMainframe = (color: string) => {
  switch (color) {
    case BasicLandType.Plains:
      return BasicLandWhiteMainframe;
    case BasicLandType.Island:
      return BasicLandBlueMainframe;
    case BasicLandType.Swamp:
      return BasicLandBlackMainframe;
    case BasicLandType.Mountain:
      return BasicLandRedMainframe;
    case BasicLandType.Forest:
      return BasicLandGreenMainframe;
    default:
      return BasicLandGoldMainframe;
  }
};

export const getRarityIcon = (rarity: RarityType) => {
  if (rarity === RarityType.MythicRare) return MythicRareIcon;
  if (rarity === RarityType.Rare) return RareIcon;
  if (rarity === RarityType.Uncommon) return UncommonIcon;
  return CommonIcon;
};
