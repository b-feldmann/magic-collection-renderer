import * as PIXI from 'pixi.js';

export interface RenderTextBoxCache {
  text: PIXI.Text;
  textDivider: PIXI.Loader;
  flavourText: PIXI.Text;
  backgroundSprite: PIXI.TilingSprite;
}

export const renderTextBox = (
  app: PIXI.Application,
  resources: any,
  background: string,
  color: number,
  instructions: string[],
  flavourText: string | undefined,
  flavourAuthor: string | undefined,
  cache: undefined | RenderTextBoxCache
) => {
  const scale = 2;
  const backgroundSprite = new PIXI.TilingSprite(resources[background].texture);
  backgroundSprite.x = 40;
  backgroundSprite.y = 463;
  backgroundSprite.width = 448 / scale;
  backgroundSprite.height = 220 / scale;
  backgroundSprite.scale = new PIXI.Point(scale, scale);
  backgroundSprite.tint = color;
  backgroundSprite.alpha = 0.5;
  app.stage.addChild(backgroundSprite);

  const box = new PIXI.Graphics();
  // big color radius
  box.lineStyle(6, color, 1);
  box.moveTo(37, 458);
  box.lineTo(37, 685);
  box.lineTo(491, 685);
  box.lineTo(491, 461);
  box.lineTo(34, 461);

  // inner black border
  box.lineStyle(2, 0xffffff, 0.4);
  box.moveTo(41, 462);
  box.lineTo(41, 683);
  box.lineTo(488, 683);
  box.lineStyle(2, 0x666666, 0.7);
  box.moveTo(489, 684);
  box.lineTo(489, 463);
  box.lineTo(42, 463);

  // // inner grey shadow
  // box.lineStyle(2, 0x000000, 0.3);
  // box.moveTo(39, 80);
  // box.lineTo(39, 415);
  // box.lineTo(491, 415);
  // box.lineTo(491, 81);
  // box.lineTo(40, 81);

  // // right white shadow
  // box.lineStyle(2, color, 0.5);
  // box.moveTo(495, 418);
  // box.lineTo(495, 78);

  // left black strong shadow
  box.lineStyle(4, 0x000000, 0.5);
  box.moveTo(34, 456);
  box.lineTo(34, 690);

  // left black outer shadow
  box.lineStyle(2, 0x000000, 0.2);
  box.moveTo(31, 456);
  box.lineTo(31, 690);
  app.stage.addChild(box);

  return { text: null, textDivider: null, flavourText: null };
};
