import ColorlessMainframe from './images/mainframes/Art.png';
import WhiteMainframe from './images/mainframes/W.png';
import BlueMainframe from './images/mainframes/U.png';
import BlackMainframe from './images/mainframes/B.png';
import RedMainframe from './images/mainframes/R.png';
import GreenMainframe from './images/mainframes/G.png';
import GoldMainframe from './images/mainframes/Gld.png';

import InvocationWhiteMainframe from './images/mainframes/invocation/W.png';
import InvocationBlueMainframe from './images/mainframes/invocation/U.png';
import InvocationBlackMainframe from './images/mainframes/invocation/B.png';
import InvocationRedMainframe from './images/mainframes/invocation/R.png';
import InvocationGreenMainframe from './images/mainframes/invocation/G.png';
import InvocationGoldMainframe from './images/mainframes/invocation/Gld.png';

import LowResWhiteMainframe from './images/mainframes/lowRes/W.png';
import LowResBlueMainframe from './images/mainframes/lowRes/U.png';
import LowResBlackMainframe from './images/mainframes/lowRes/B.png';
import LowResRedMainframe from './images/mainframes/lowRes/R.png';
import LowResGreenMainframe from './images/mainframes/lowRes/G.png';
import LowResGoldMainframe from './images/mainframes/lowRes/Gld.png';
import LowResColorlessMainframe from './images/mainframes/lowRes/Art.png';

import UnstableBasicLandWhiteMainframe from './images/mainframes/lands/unstable/W.png';
import UnstableBasicLandBlueMainframe from './images/mainframes/lands/unstable/U.png';
import UnstableBasicLandBlackMainframe from './images/mainframes/lands/unstable/B.png';
import UnstableBasicLandRedMainframe from './images/mainframes/lands/unstable/R.png';
import UnstableBasicLandGreenMainframe from './images/mainframes/lands/unstable/G.png';
import UnstableBasicLandGoldMainframe from './images/mainframes/lands/unstable/Gld.png';

import FullArtBasicLandWhiteMainframe from './images/mainframes/lands/fullArt/W.png';
import FullArtBasicLandBlueMainframe from './images/mainframes/lands/fullArt/U.png';
import FullArtBasicLandBlackMainframe from './images/mainframes/lands/fullArt/B.png';
import FullArtBasicLandRedMainframe from './images/mainframes/lands/fullArt/R.png';
import FullArtBasicLandGreenMainframe from './images/mainframes/lands/fullArt/G.png';
import FullArtBasicLandGoldMainframe from './images/mainframes/lands/fullArt/A.png';

import BasicLandWhiteMainframe from './images/mainframes/lands/W.png';
import BasicLandBlueMainframe from './images/mainframes/lands/U.png';
import BasicLandBlackMainframe from './images/mainframes/lands/B.png';
import BasicLandRedMainframe from './images/mainframes/lands/R.png';
import BasicLandGreenMainframe from './images/mainframes/lands/G.png';
import BasicLandGoldMainframe from './images/mainframes/lands/A.png';

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
import InvocationPt from './images/pt/invocation/A.png';
import PtArt from './images/pt/Art.png';
import PtW from './images/pt/W.png';
import PtU from './images/pt/U.png';
import PtB from './images/pt/B.png';
import PtR from './images/pt/R.png';
import PtG from './images/pt/G.png';
import PtCl from './images/pt/C.png';
import PtGld from './images/pt/Gld.png';

import SymbolLandWhite from './images/symbols/land/W.png';
import SymbolLandBlue from './images/symbols/land/U.png';
import SymbolLandBlack from './images/symbols/land/B.png';
import SymbolLandRed from './images/symbols/land/R.png';
import SymbolLandGreen from './images/symbols/land/G.png';
import SymbolLandColorless from './images/symbols/land/C.png';

import MythicRareIcon from './images/rarity/mythic.png';
import RareIcon from './images/rarity/rare.png';
import UncommonIcon from './images/rarity/uncommon.png';
import CommonIcon from './images/rarity/common.png';

import { BasicLandArtStyles, BasicLandType, ColorType, RarityType } from '../../interfaces/enums';

export const getPt = (color: ColorType) => {
  switch (color) {
    case ColorType.White:
      return PtW;
    case ColorType.Blue:
      return PtU;
    case ColorType.Black:
      return PtB;
    case ColorType.Red:
      return PtR;
    case ColorType.Green:
      return PtG;
    case ColorType.Gold:
      return PtGld;
    default:
      return PtCl;
  }
};

export const getArtifactPt = (color: ColorType) =>
  color === ColorType.Colorless ? PtArt : getPt(color);

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

export const getInvocationPt = () => InvocationPt;

export const getInvocationMainframe = (color: ColorType) => {
  switch (color) {
    case ColorType.White:
      return InvocationWhiteMainframe;
    case ColorType.Blue:
      return InvocationBlueMainframe;
    case ColorType.Black:
      return InvocationBlackMainframe;
    case ColorType.Red:
      return InvocationRedMainframe;
    case ColorType.Green:
      return InvocationGreenMainframe;
    default:
      return InvocationGoldMainframe;
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
  return GoldInnerBorder;
};

export const getLandOverlay = () => LandOverlay;

export const getArtifactMainframe = () => ColorlessMainframe;

export const getLandMainframe = () => LandColorlessMainframe;

export const getBasicLandSymbols = (landType: BasicLandType) => {
  switch (landType) {
    case BasicLandType.Plains:
      return SymbolLandWhite;
    case BasicLandType.Island:
      return SymbolLandBlue;
    case BasicLandType.Swamp:
      return SymbolLandBlack;
    case BasicLandType.Mountain:
      return SymbolLandRed;
    case BasicLandType.Forest:
      return SymbolLandGreen;
    default:
      return SymbolLandColorless;
  }
};

export const getBasicLandMainframe = (color: string, artStyle: BasicLandArtStyles) => {
  switch (color) {
    case BasicLandType.Plains:
      if (artStyle === BasicLandArtStyles.Unstable) return UnstableBasicLandWhiteMainframe;
      if (artStyle === BasicLandArtStyles.FullArt) return FullArtBasicLandWhiteMainframe;
      return BasicLandWhiteMainframe;
    case BasicLandType.Island:
      if (artStyle === BasicLandArtStyles.Unstable) return UnstableBasicLandBlueMainframe;
      if (artStyle === BasicLandArtStyles.FullArt) return FullArtBasicLandBlueMainframe;
      return BasicLandBlueMainframe;
    case BasicLandType.Swamp:
      if (artStyle === BasicLandArtStyles.Unstable) return UnstableBasicLandBlackMainframe;
      if (artStyle === BasicLandArtStyles.FullArt) return FullArtBasicLandBlackMainframe;
      return BasicLandBlackMainframe;
    case BasicLandType.Mountain:
      if (artStyle === BasicLandArtStyles.Unstable) return UnstableBasicLandRedMainframe;
      if (artStyle === BasicLandArtStyles.FullArt) return FullArtBasicLandRedMainframe;
      return BasicLandRedMainframe;
    case BasicLandType.Forest:
      if (artStyle === BasicLandArtStyles.Unstable) return UnstableBasicLandGreenMainframe;
      if (artStyle === BasicLandArtStyles.FullArt) return FullArtBasicLandGreenMainframe;
      return BasicLandGreenMainframe;
    default:
      if (artStyle === BasicLandArtStyles.Unstable) return UnstableBasicLandGoldMainframe;
      if (artStyle === BasicLandArtStyles.FullArt) return FullArtBasicLandGoldMainframe;
      return BasicLandGoldMainframe;
  }
};

export const getRarityIcon = (rarity: RarityType) => {
  if (rarity === RarityType.MythicRare) return MythicRareIcon;
  if (rarity === RarityType.Rare) return RareIcon;
  if (rarity === RarityType.Uncommon) return UncommonIcon;
  return CommonIcon;
};
