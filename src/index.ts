/// <reference lib="DOM" />
import * as express from 'express';
import {readFileSync} from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {stringify} from 'querystring';
import {URL} from 'url';

const bookSource = JSON.parse(readFileSync('jueshitangmen.info.json', 'utf8'));
const app: express.Application = express();

app.use(express.json());
app.use(express.static('dist'));

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

//{"name":"斗罗大陆4终极斗罗","author":"唐家三少","summary":"一万年后，冰化了。斗罗联邦科考队在极北之地科考时发现了一个有着金银双色花纹的蛋，用仪器探察之后，发现里面居然有生命体征，赶忙将其带回研究所进行孵化。蛋孵化出来了，可孵出来的却是一个婴儿，和人类一模一样的婴儿，一个蛋生的孩子。...","cover":"https://img.jueshitangmen.info/27/264865.jpg","detail":"https://www.jueshitangmen.info/27/"}
app.post('/detail', async (req, res) => {
  const reqData = req.body;
  const response = await axios.get(reqData['detail']);
  const $ = cheerio.load(response.data);
  const detailResult = {
    author: '',
    catalog: '',
    cover: '',
    lastChapter: '',
    name: '',
    status: '',
    summary: '',
    update: '',
    url: '',
  };
  if (reqData.name) {
    detailResult.name = reqData.name;
  } else {
    detailResult.name = $(bookSource.detail.name).text();
  }
  if (reqData.author) {
    detailResult.author = reqData.author;
  } else {
    detailResult.author = $(bookSource.detail.author).text();
  }
  if (reqData.cover) {
    detailResult.cover = reqData.cover;
  } else {
    const attrCover = $(bookSource.detail.cover).attr('src');
    if (typeof attrCover === 'string') {
      detailResult.cover = attrCover;
    }
  }
  if (reqData.summary) {
    detailResult.summary = reqData.summary;
  } else {
    detailResult.summary = $(bookSource.detail.summary).text();
  }
  //TODO bookSource.detail.update
  detailResult.lastChapter = $(bookSource.detail.lastChapter).text();
  detailResult.catalog = reqData.detail;
  detailResult.url = reqData.url;
  res.json(detailResult);
});

app.post('/catalog', async (req, res) => {
  const reqData = req.body;
  const response = await axios.get(reqData['catalog']);
  const $ = cheerio.load(response.data);
  const catalogResult = [];
  for (const iterator of $(bookSource.catalog.list).toArray()) {
    const $iterator = $(iterator);
    const entry = {name: '', url: '', useLevel: false};
    entry.name = $iterator.find(bookSource.catalog.name).text();
    let attrSrc = $iterator.find(bookSource.catalog.chapter).attr('href');
    if (typeof attrSrc !== 'string') {
      continue;
    } else {
      if (attrSrc.indexOf('/') === 0) {
        const catalogURL = new URL(reqData['catalog']);
        attrSrc = catalogURL.origin + attrSrc;
      }
      entry.url = attrSrc;
    }
    catalogResult.push(entry);
  }
  res.json(catalogResult);
});

app.post('/chapter', async (req, res) => {
  const reqData = req.body;
  const response = await axios.get(reqData['url']);
  const $ = cheerio.load(response.data);
  const allP: string[] = [];
  const chapterResult = {
    content: '',
  };

  for (const iterator of $(bookSource.chapter.content).toArray()) {
    allP.push($(iterator).text());
  }
  chapterResult.content = allP.join('\n');
  res.json(chapterResult);
});

app.listen(3000, () => {
  console.log('Listen on prot 3000!');
});
