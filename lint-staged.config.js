module.exports = {
  '*.{ts,tsx}': (files) => [
    `eslint --fix ${files.join(' ')}`,
    `prettier --write ${files.join(' ')}`,
    `vitest related --run ${files.join(' ')}`,
    // tsc ignores tsconfig.json when given explicit files, so type-check the
    // whole project (no file arguments).
    'tsc --noEmit',
  ],
  '*.{css,scss,json}': 'prettier --write',
};
