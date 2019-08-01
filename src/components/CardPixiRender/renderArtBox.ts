import * as PIXI from 'pixi.js';

export interface RenderArtBoxCache {
  artSprite: PIXI.Sprite;
  coverLoader: PIXI.Loader;
}

export const renderArtBox = (
  app: PIXI.Application,
  resources: any,
  color: number,
  image: string = '',
  fallBackImage: string,
  cache: undefined | RenderArtBoxCache
) => {
  let artSprite: PIXI.Sprite;

  if (cache) {
    ({ artSprite } = cache);
  } else {
    const box = new PIXI.Graphics();
    // big color radius
    box.lineStyle(6, color, 1);
    box.moveTo(37, 80);
    box.lineTo(37, 415);
    box.lineTo(491, 415);
    box.lineTo(491, 81);
    box.lineTo(34, 81);

    // inner black border
    box.lineStyle(2, 0x000000, 1);
    box.moveTo(41, 82);
    box.lineTo(41, 413);
    box.lineTo(489, 413);
    box.lineTo(489, 83);
    box.lineTo(42, 83);

    // inner grey shadow
    box.lineStyle(2, 0x000000, 0.3);
    box.moveTo(39, 80);
    box.lineTo(39, 415);
    box.lineTo(491, 415);
    box.lineTo(491, 81);
    box.lineTo(40, 81);

    // right white shadow
    box.lineStyle(2, color, 0.5);
    box.moveTo(495, 418);
    box.lineTo(495, 78);

    // left black strong shadow
    box.lineStyle(4, 0x000000, 0.5);
    box.moveTo(34, 74);
    box.lineTo(34, 420);

    // left black outer shadow
    box.lineStyle(2, 0x000000, 0.2);
    box.moveTo(31, 74);
    box.lineTo(31, 421);
    app.stage.addChild(box);

    artSprite = new PIXI.Sprite(resources[fallBackImage].texture);
    artSprite.x = 42;
    artSprite.y = 84;
    artSprite.width = 446;
    artSprite.height = 328;
    app.stage.addChild(artSprite);
  }

  let error = false;

  const coverLoader = cache ? cache.coverLoader.reset() : new PIXI.Loader();
  coverLoader.add(image).load((loader: PIXI.Loader, coverResource: any) => {
    const artTexture = coverResource[image].texture;
    if (artTexture && artTexture.valid && !error) {
      artSprite.texture = artTexture;
    } else artSprite.texture = resources[fallBackImage].texture;
  });
  coverLoader.onError.add(() => {
    error = true;
  });

  return { artSprite, coverLoader };
};
