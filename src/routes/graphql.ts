import * as express from 'express';
import {graphqlHTTP} from 'express-graphql';
import {buildSchema} from 'graphql';
import {readFileSync} from 'fs';
import BookSource from '../models/BookSource';
import axios from 'axios';
import {BookSource as BookSourceContent} from '../BookSourceMgr';

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
