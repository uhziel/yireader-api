import * as express from 'express';
import {graphqlHTTP} from 'express-graphql';
import {buildSchema} from 'graphql';
import {readFileSync} from 'fs';

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
import {books, createBook, deleteBook} from '../resolvers/Book';
import {
  bookChapter,
  createBookChapter,
  createBookChapters,
} from '../resolvers/BookChapter';

import {search} from '../resolvers/Search';
import {version} from '../resolvers/Version';

const router = express.Router();

const scheme = buildSchema(readFileSync('src/api.graphql', 'utf8'));

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
  createBook,
  deleteBook,

  bookChapter,
  createBookChapter,
  createBookChapters,

  search,
  version,
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
