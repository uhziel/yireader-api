import * as express from 'express';
import {graphqlHTTP} from 'express-graphql';
import {buildSchema} from 'graphql';
import {readFileSync} from 'fs';

import {
  bookSources,
  createBookSource,
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

const router = express.Router();

const scheme = buildSchema(readFileSync('src/api.graphql', 'utf8'));

const root = {
  bookSources,
  createBookSource,
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
