import * as PIXI from 'pixi.js';

export interface RenderArtBoxCache {
  artSprite: PIXI.Sprite;
  coverLoader: PIXI.Loader;
}

export const renderArtBox = (
  app: PIXI.Application,
  resources: any,
  image: string = '',
  fallBackImage: string,
  cache: undefined | RenderArtBoxCache
) => {
  let artSprite: PIXI.Sprite;

  if (cache) {
    artSprite = cache.artSprite;
  } else {
    const box = new PIXI.Graphics();
    box.lineStyle(2, 0x000000, 1);
    box.moveTo(41, 82);
    box.lineTo(41, 413);
    box.lineTo(489, 413);
    box.lineTo(489, 83);
    box.lineTo(40, 83);

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

  return { artSprite, coverLoader: coverLoader };
};
