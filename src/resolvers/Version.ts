import {readFileSync} from 'fs';

const p = JSON.parse(readFileSync('package.json', 'utf8'));

export const version = async () => {
  return p.version;
};
