import * as express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {URL} from 'url';
import bookSourceMgr from '../BookSourceMgr';
import {BookSource} from '../BookSourceMgr';
import {extractData} from '../utils';

const router = express.Router();

interface CatalogEntry {
  name: string;
  url: string;
  useLevel: boolean;
}

function clearRepeatlyCatalogEntry(catalog: CatalogEntry[]): CatalogEntry[] {
  let repeatlyIndex = 0;
  for (let index = 0; index < catalog.length; index++) {
    if (catalog[index].name === catalog[catalog.length - 1 - index].name) {
      repeatlyIndex = index;
    } else {
      break;
    }
  }
  return catalog.slice(repeatlyIndex + 1);
}

function fillCatalogResult(
  bookSource: BookSource,
  catalogResult: CatalogEntry[],
  $iterator: cheerio.Cheerio,
  catalogURLOrigin: string
) {
  const entry = {name: '', url: '', useLevel: false};
  entry.name = extractData($iterator, bookSource.catalog.name, 'text');
  let attrSrc = extractData($iterator, bookSource.catalog.chapter, 'href');
  if (attrSrc.length === 0) {
    return;
  } else {
    if (attrSrc.indexOf('/') === 0) {
      attrSrc = catalogURLOrigin + attrSrc;
    }
    entry.url = attrSrc;
  }
  catalogResult.push(entry);
}

async function handleCatalog(req: express.Request, res: express.Response) {
  const reqData = req.body;
  const response = await axios.get(reqData['catalog']);
  const $ = cheerio.load(response.data);
  let catalogResult: CatalogEntry[] = [];
  const catalogURL = new URL(reqData['catalog']);
  const bookSource = bookSourceMgr.getBookSource(catalogURL.hostname);
  if (!bookSource) {
    res.status(400).send('Bad Request');
    return;
  }
  for (const iterator of $(bookSource.catalog.list).toArray()) {
    const $iterator = $(iterator);
    if (bookSource.catalog.booklet) {
      for (const iterator2 of $iterator
        .find(bookSource.catalog.booklet.list)
        .toArray()) {
        const $iterator2 = $(iterator2);
        fillCatalogResult(
          bookSource,
          catalogResult,
          $iterator2,
          catalogURL.origin
        );
      }
    } else {
      fillCatalogResult(
        bookSource,
        catalogResult,
        $iterator,
        catalogURL.origin
      );
    }
  }
  catalogResult = clearRepeatlyCatalogEntry(catalogResult);
  res.json(catalogResult);
}

router.post('/', (req, res, next) => {
  handleCatalog(req, res).catch(next);
});

export default router;
