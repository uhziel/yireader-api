import * as express from 'express';
import {graphqlHTTP} from 'express-graphql';
import {buildSchema} from 'graphql';
import {readFileSync} from 'fs';
import BookSource from '../models/BookSource';
import axios from 'axios';
import {BookSource as BookSourceContent} from '../BookSourceMgr';
import WebResource from '../models/WebResource';
import Author from '../models/Author';

const router = express.Router();

const scheme = buildSchema(readFileSync('src/api.graphql', 'utf8'));

interface CreateBookSourceInput {
  downloadUrl: string;
}

interface EnableSearchBookSourceInput {
  _id: string;
  value: boolean;
}

interface DeleteBookSourceInput {
  _id: string;
}

interface WebResourceInput {
  url: string;
}

interface CreateAuthorInput {
  name: string;
}

const root = {
  bookSources: async () => {
    const bookSources = await BookSource.find({});
    return bookSources;
  },
  createBookSource: async (args: CreateBookSourceInput) => {
    const bookSourceDoc = await BookSource.findOne({
      downloadUrl: args.downloadUrl,
    });
    if (bookSourceDoc) {
      return null;
    }

    const response = await axios.get(args.downloadUrl);
    const bookSourceContent: BookSourceContent = response.data;

    if (!bookSourceContent) {
      return null;
    }

    const newBookSourceDoc = new BookSource({
      downloadUrl: args.downloadUrl,
      name: bookSourceContent.name,
      url: bookSourceContent.url,
      version: bookSourceContent.version,
      data: JSON.stringify(response.data),
      enableSearch: true,
    });
    await newBookSourceDoc.save();

    return newBookSourceDoc;
  },
  enableSearchBookSource: async (args: EnableSearchBookSourceInput) => {
    const bookSource = await BookSource.findById(args._id);
    if (!bookSource) {
      return false;
    }
    bookSource.enableSearch = args.value;
    await bookSource.save();
    return true;
  },
  deleteBookSource: async (args: DeleteBookSourceInput) => {
    await BookSource.deleteOne({_id: args._id});
    return true;
  },
  webResources: async () => {
    const webResources = await WebResource.find({});
    return webResources;
  },
  webResource: async (args: WebResourceInput) => {
    return await WebResource.findOne({url: args.url});
  },
  createWebResource: async (args: WebResourceInput) => {
    const response = await axios.get(args.url, {
      responseType: 'arraybuffer',
    });

    const webResource = new WebResource({
      url: args.url,
      mediaType: response.headers['content-type'],
      blob: response.data,
    });
    await webResource.save();
    return webResource;
  },
  authors: async () => {
    return await Author.find({});
  },
  createAuthor: async (args: CreateAuthorInput) => {
    const author = new Author({
      name: args.name,
    });
    await author.save();
    return author;
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
