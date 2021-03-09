import BookSource from '../models/BookSource';
import User from '../models/User';
import axios from 'axios';
import {BookSource as BookSourceContent} from '../BookSourceMgr';
import {PopulateOptions} from 'mongoose';
import {GraphQLContext} from '.';
import {URL} from 'url';

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

export const bookSourcesById = async (id: string) => {
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

export const bookSources = async (_: unknown, context: GraphQLContext) => {
  return bookSourcesByUserId(context.req.user?.id);
};

function getCdnUrl(url: string) {
  const urlObject = new URL(url);
  if (urlObject.origin === 'https://raw.githubusercontent.com') {
    if (urlObject.pathname.length > 1) {
      const parts = urlObject.pathname.split('/');
      if (parts.length >= 5) {
        const author = parts[1];
        const repo = parts[2];
        const cdnUrl = `https://cdn.jsdelivr.net/gh/${author}/${repo}/${parts
          .slice(4)
          .join('/')}`;
        return cdnUrl;
      }
    }
  }
  return null;
}

async function fetchBookSource(url: string) {
  const cdnUrl = getCdnUrl(url);
  if (cdnUrl) {
    try {
      const response = await axios.get(cdnUrl);
      return response;
    } catch (e) {
      console.error(e);
    }
  }

  const response = await axios.get(url);
  return response;
}

export const createBookSource = async (
  args: CreateBookSourceInput,
  context: GraphQLContext
) => {
  const bookSourceDoc = await BookSource.findOne({
    user: context.req.user?.id,
    downloadUrl: args.downloadUrl,
  });
  if (bookSourceDoc) {
    throw new Error('不要重复添加书源');
  }

  const response = await fetchBookSource(args.downloadUrl);
  const bookSourceContent: BookSourceContent = response.data;

  if (!bookSourceContent || typeof bookSourceContent === 'string') {
    throw new Error('提供的链接不是有效的书源');
  }

  const user = await User.findById(context.req.user?.id, 'bookSources');
  if (!user) {
    throw new Error('登录信息不对，无法添加书源');
  }

  const newBookSourceDoc = new BookSource({
    user: context.req.user?.id,
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
  context: GraphQLContext
) => {
  const user = await User.findById(context.req.user?.id, 'bookSources');
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
  context: GraphQLContext
) => {
  const user = await User.findById(context.req.user?.id, 'bookSources');
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
  context: GraphQLContext
) => {
  const bookSource = await BookSource.findOne({
    _id: args.id,
    user: context.req.user?.id,
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
  context: GraphQLContext
) => {
  const user = await User.findById(context.req.user?.id, 'bookSources');
  if (!user) {
    return false;
  }
  const pos = user.bookSources.indexOf(args.id);
  if (pos === -1) {
    return false;
  }
  user.bookSources.pull(args.id);
  await user.save();
  await BookSource.deleteOne({_id: args.id, user: context.req.user?.id});
  return true;
};
