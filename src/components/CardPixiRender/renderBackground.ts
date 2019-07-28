import * as PIXI from 'pixi.js';

interface RenderBackgroundCache {
  backgroundSprite: PIXI.TilingSprite;
  backgroundSprite2: PIXI.TilingSprite;
}

export const renderBackground = (
  app: PIXI.Application,
  resources: any,
  backgroundKey: string,
  cache: undefined | RenderBackgroundCache
): RenderBackgroundCache => {
  const backGroundTexture = resources[backgroundKey].texture;
  if (cache) {
    cache.backgroundSprite.texture = backGroundTexture;
    cache.backgroundSprite2.texture = backGroundTexture;
    return cache;
  }

  let backgroundSprite = new PIXI.TilingSprite(backGroundTexture);
  backgroundSprite.x = 22;
  backgroundSprite.y = 22;
  backgroundSprite.width = 486;
  backgroundSprite.height = 326 * 2;
  app.stage.addChild(backgroundSprite);

  const cardBorderGraphics = new PIXI.Graphics();
  cardBorderGraphics.clear();
  cardBorderGraphics.lineStyle(1, 0x000000);
  cardBorderGraphics.beginFill(0x171314);
  cardBorderGraphics.drawRoundedRect(0, 0, 265 * 2, 370 * 2, 24);
  cardBorderGraphics.endFill();
  cardBorderGraphics.beginHole();
  cardBorderGraphics.drawRoundedRect(
    22,
    22,
    486,
    backGroundTexture.height * 1.5,
    16
  );
  cardBorderGraphics.drawRoundedRect(
    22,
    22 + backGroundTexture.height * 1.5,
    486,
    326 * 2 - backGroundTexture.height * 1.5,
    42
  );
  cardBorderGraphics.endHole();
  app.stage.addChild(cardBorderGraphics);

  const backgroundSprite2 = new PIXI.TilingSprite(backGroundTexture);
  backgroundSprite2.x = 22;
  backgroundSprite2.y = 22 + backGroundTexture.height;
  backgroundSprite2.width = 486;
  backgroundSprite2.height = Math.min(
    backGroundTexture.height,
    326 * 2 - 22 + backGroundTexture.height
  );
  app.stage.addChild(backgroundSprite2);

  return { backgroundSprite, backgroundSprite2 };
};
