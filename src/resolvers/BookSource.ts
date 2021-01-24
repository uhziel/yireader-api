import BookSource from '../models/BookSource';
import axios from 'axios';
import {BookSource as BookSourceContent} from '../BookSourceMgr';
import {Request} from 'express';

interface CreateBookSourceInput {
  downloadUrl: string;
}

interface EnableSearchBookSourceInput {
  id: string;
  value: boolean;
}

interface DeleteBookSourceInput {
  id: string;
}

export const bookSources = async (_: unknown, req: Request) => {
  const bookSources = await BookSource.find({user: req.user?.id});
  return bookSources;
};

export const createBookSource = async (
  args: CreateBookSourceInput,
  req: Request
) => {
  const bookSourceDoc = await BookSource.findOne({
    user: req.user?.id,
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
    user: req.user?.id,
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
  args: EnableSearchBookSourceInput,
  req: Request
) => {
  const bookSource = await BookSource.findOne({
    _id: args.id,
    user: req.user?.id,
  });
  if (!bookSource) {
    return false;
  }

  bookSource.enableSearch = args.value;
  await bookSource.save();
  return true;
};

export const deleteBookSource = async (
  args: DeleteBookSourceInput,
  req: Request
) => {
  await BookSource.deleteOne({_id: args.id, user: req.user?.id});
  return true;
};
