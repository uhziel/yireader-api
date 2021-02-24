import {Router} from 'express';
import {graphqlHTTP} from 'express-graphql';
import {buildSchema} from 'graphql';
import {readFileSync} from 'fs';

import {IncomingMessage, ServerResponse} from 'http';
type Request = IncomingMessage & {
  url: string;
};
type Response = ServerResponse & {
  json?: (data: unknown) => void;
};

import {
  bookSources,
  createBookSource,
  moveUpBookSource,
  moveDownBookSource,
  enableSearchBookSource,
  deleteBookSource,
} from '../resolvers/BookSource';
import {
  webResources,
  webResource,
  createWebResource,
} from '../resolvers/WebResource';
import {authors, createAuthor} from '../resolvers/Author';
import {
  books,
  book,
  addBookToBookShelf,
  createBook,
  deleteBook,
  moveUpBook,
  moveDownBook,
  reverseOrderBook,
} from '../resolvers/Book';
import {bookChapter} from '../resolvers/BookChapter';

import {search} from '../resolvers/Search';
import {version} from '../resolvers/Version';

const router = Router();

const scheme = buildSchema(readFileSync('assets/api.graphql', 'utf8'));

const root = {
  bookSources,
  createBookSource,
  moveUpBookSource,
  moveDownBookSource,
  enableSearchBookSource,
  deleteBookSource,

  webResources,
  webResource,
  createWebResource,

  authors,
  createAuthor,

  books,
  book,
  addBookToBookShelf,
  createBook,
  deleteBook,
  moveUpBook,
  moveDownBook,
  reverseOrderBook,

  bookChapter,

  search,
  version,
};

router.use(
  '/',
  graphqlHTTP((req: Request, res: Response) => {
    const optionsData = {
      schema: scheme,
      rootValue: root,
      graphiql: process.env.NODE_ENV !== 'production',
      context: {
        req,
        res,
      },
    };
    return optionsData;
  })
);

export default router;
