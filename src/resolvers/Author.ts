import Author from '../models/Author';

interface CreateAuthorInput {
  name: string;
}

export const authors = async () => {
  return await Author.find({});
};

async function _createAuthor(name: string) {
  const author = new Author({
    name: name,
  });
  await author.save();
  return author;
}

export const createAuthor = async (args: CreateAuthorInput) => {
  const isExist = await Author.exists({name: args.name});
  if (isExist) {
    throw new Error('已经有同名作者');
  }

  return await _createAuthor(args.name);
};

export async function getAuthorId(name: string) {
  const author = await Author.findOne({name: name});
  if (author) {
    return author.id;
  }

  const newAuthor = await _createAuthor(name);
  return newAuthor.id;
}
