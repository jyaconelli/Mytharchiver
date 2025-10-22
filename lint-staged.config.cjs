module.exports = {
  'src/**/*.{ts,tsx,js,jsx}': ['eslint --max-warnings=0 --fix', 'prettier --write'],
  'src/**/*.{css,md,json}': ['prettier --write'],
};
