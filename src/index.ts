/// <reference lib="DOM" />
import * as express from 'express';
import {readFileSync} from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {stringify} from 'querystring';
import {URL} from 'url';

const bookSource = JSON.parse(readFileSync('jueshitangmen.info.json', 'utf8'));
const app: express.Application = express();

app.get('/', (req, res) => {
  res.send('Hello world');
});

app.get('/search', async (req, res) => {
  const q = req.query;
  let searchKey = '';
  if (typeof q['key'] === 'string') {
    searchKey = q['key'];
  } else {
    res.status(400).send('Bad Request');
    return;
  }
  const searchURLStr = 'https://www.jueshitangmen.info/search.html';
  const response = await axios.post(
    searchURLStr,
    stringify({
      searchtype: 'all',
      searchkey: searchKey,
    })
  );
  const $ = cheerio.load(response.data);
  const searchResult = [];
  for (const iterator of $(bookSource.search.list).toArray()) {
    const $iterator = $(iterator);
    const entry = {name: '', author: '', summary: '', cover: '', detail: ''};
    entry.name = $iterator.find(bookSource.search.name).text();
    entry.author = $iterator.find(bookSource.search.author).text();
    entry.summary = $iterator.find(bookSource.search.summary).text();
    const attrCover = $iterator.find(bookSource.search.cover).attr('src');
    if (typeof attrCover !== 'string') {
      continue;
    } else {
      entry.cover = attrCover;
    }
    let attrDetail = $iterator.find(bookSource.search.detail).attr('href');
    if (typeof attrDetail !== 'string') {
      continue;
    } else {
      if (attrDetail.indexOf('/') === 0) {
        const searchURL = new URL(searchURLStr);
        attrDetail = searchURL.origin + attrDetail;
      }
      entry.detail = attrDetail;
    }
    searchResult.push(entry);
  }
  res.json(searchResult);
});

app.listen(3000, () => {
  console.log('Listen on prot 3000!');
});
