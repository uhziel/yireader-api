import * as express from 'express';
import {graphqlHTTP} from 'express-graphql';
import {buildSchema} from 'graphql';
import {readFileSync} from 'fs';
import bookSourceMgr from '../BookSourceMgr';

const router = express.Router();

const scheme = buildSchema(readFileSync('src/api.graphql', 'utf8'));

interface BookSourceSimpleInfo {
  name: string;
  url: string;
}

const root = {
  bookSources: () => {
    const bookSources = bookSourceMgr.getAllBookSources();
    const bookSourceList: BookSourceSimpleInfo[] = [];
    for (const bookSource of bookSources) {
      const info: BookSourceSimpleInfo = {
        name: bookSource.name,
        url: bookSource.url,
      };
      bookSourceList.push(info);
    }
    return bookSourceList;
  },
};

router.use(
  '/',
  graphqlHTTP({
    schema: scheme,
    rootValue: root,
    graphiql: process.env.NODE_ENV !== 'production',
  })
);

export default router;
