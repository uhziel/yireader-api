import BookSource from '../models/BookSource';
import axios from 'axios';
import {BookSource as BookSourceContent} from '../BookSourceMgr';

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

export const bookSources = async () => {
  const bookSources = await BookSource.find({});
  return bookSources;
};

export const createBookSource = async (args: CreateBookSourceInput) => {
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
};

export const enableSearchBookSource = async (
  args: EnableSearchBookSourceInput
) => {
  const bookSource = await BookSource.findById(args._id);
  if (!bookSource) {
    return false;
  }
  bookSource.enableSearch = args.value;
  await bookSource.save();
  return true;
};

export const deleteBookSource = async (args: DeleteBookSourceInput) => {
  await BookSource.deleteOne({_id: args._id});
  return true;
};
