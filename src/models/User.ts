import {Schema, Document, model, Types} from 'mongoose';
import {BookSourceInterface} from './BookSource';
import {BookInterface} from './Book';

export interface UserInterface extends Document {
  username: string;
  password: string;
  bookSources: Types.Array<BookSourceInterface['id']>;
  tmpBooks: Types.Array<BookInterface['id']>;
  books: Types.Array<BookInterface['id']>;
}

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    bookSources: [
      {
        type: Schema.Types.ObjectId,
        ref: 'BookSource',
        required: true,
      },
    ],
    tmpBooks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Book',
        required: true,
      },
    ],
    books: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Book',
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default model<UserInterface>('User', userSchema);
