import * as express from 'express';
import {graphqlHTTP} from 'express-graphql';
import {buildSchema} from 'graphql';
import {readFileSync} from 'fs';
import BookSource from '../models/BookSource';

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
    const bookSource = new BookSource({
      downloadUrl: args.downloadUrl,
      name: '百度',
      url: 'baidu.com',
      version: 100,
      data: 'hello',
      enableSearch: true,
    });
    await bookSource.save();

    return bookSource;
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
