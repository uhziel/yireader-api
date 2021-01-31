import {Schema, Document, model, Types} from 'mongoose';
import {BookSourceInterface} from './BookSource';
import {BookInterface} from './Book';

export interface UserInterface extends Document {
  username: string;
  password: string;
  bookSources: Types.Array<BookSourceInterface['id']>;
  books: Types.Array<BookInterface['id']>;
}

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  //TODO 改为 timestamps: true
  createData: {
    type: Date,
    default: Date.now,
  },
  bookSources: [
    {
      type: Schema.Types.ObjectId,
      ref: 'BookSource',
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
});

export default model<UserInterface>('User', userSchema);
