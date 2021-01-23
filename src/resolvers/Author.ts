import Author from '../models/Author';

interface CreateAuthorInput {
  name: string;
}

export const authors = async () => {
  return await Author.find({});
};

export const createAuthor = async (args: CreateAuthorInput) => {
  const author = new Author({
    name: args.name,
  });
  await author.save();
  return author;
};
