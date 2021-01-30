import BookSource from '../models/BookSource';
import User from '../models/User';
import axios from 'axios';
import {BookSource as BookSourceContent} from '../BookSourceMgr';
import {Request} from 'express';
import {PopulateOptions} from 'mongoose';

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

export const bookSourcesByid = async (id: string) => {
  return await BookSource.findById(id);
};

export const bookSourcesByUserId = async (
  userId?: string,
  filterEanbleSearch?: boolean
) => {
  if (!userId) {
    return [];
  }
  const user = await User.findById(userId, 'bookSources');
  if (!user) {
    return [];
  }
  const opts: PopulateOptions = {
    path: 'bookSources',
  };
  if (filterEanbleSearch) {
    opts.match = {enableSearch: true};
  }
  await user.populate(opts).execPopulate();

  return user.bookSources;
};

export const bookSources = async (_: unknown, req: Request) => {
  return bookSourcesByUserId(req.user?.id);
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
    throw new Error('不要重复添加书源');
  }

  const response = await axios.get(args.downloadUrl);
  const bookSourceContent: BookSourceContent = response.data;

  if (!bookSourceContent || typeof bookSourceContent === 'string') {
    throw new Error('提供的链接不是有效的书源');
  }

  const user = await User.findById(req.user?.id, 'bookSources');
  if (!user) {
    throw new Error('登录信息不对，无法添加书源');
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

  user.bookSources.push(newBookSourceDoc.id);
  await user.save();

  return newBookSourceDoc;
};

interface MoveUpBookSourceInput {
  id: string;
}

export const moveUpBookSource = async (
  args: MoveUpBookSourceInput,
  req: Request
) => {
  const user = await User.findById(req.user?.id, 'bookSources');
  if (!user) {
    throw new Error('登录信息不对，无法上移该书源');
  }

  const pos = user.bookSources.indexOf(args.id);
  if (pos === -1 || pos === 0) {
    throw new Error('无法上移该书源');
  }
  const tmp: string = user.bookSources[pos];
  user.bookSources.set(pos, user.bookSources[pos - 1]);
  user.bookSources.set(pos - 1, tmp);
  await user.save();

  return true;
};

interface MoveDownBookSourceInput {
  id: string;
}

export const moveDownBookSource = async (
  args: MoveDownBookSourceInput,
  req: Request
) => {
  const user = await User.findById(req.user?.id, 'bookSources');
  if (!user) {
    throw new Error('登录信息不对，无法下移该书源');
  }

  const pos = user.bookSources.indexOf(args.id);
  if (pos === -1 || pos === user.bookSources.length - 1) {
    throw new Error('无法下移该书源');
  }
  const tmp: string = user.bookSources[pos];
  user.bookSources.set(pos, user.bookSources[pos + 1]);
  user.bookSources.set(pos + 1, tmp);
  await user.save();

  return true;
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
  const user = await User.findById(req.user?.id, 'bookSources');
  if (!user) {
    return false;
  }
  const pos = user.bookSources.indexOf(args.id);
  if (pos === -1) {
    return false;
  }
  user.bookSources.pull(args.id);
  await user.save();
  await BookSource.deleteOne({_id: args.id, user: req.user?.id});
  return true;
};
