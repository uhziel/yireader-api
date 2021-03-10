import {Schema, Document, model} from 'mongoose';
import {UserInterface} from './User';
export interface BookSourceInterface extends Document {
  user: UserInterface['_id'];
  downloadUrl: string;
  name: string;
  url: string;
  version: number;
  data: string;
  fetchedAt: Date;
  enableSearch: boolean;
}

const bookSourceSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  downloadUrl: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  version: {
    type: Number,
    required: true,
  },
  data: {
    type: String,
    required: true,
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
  },
  enableSearch: {
    type: Boolean,
    default: false,
  },
});

export default model<BookSourceInterface>('BookSource', bookSourceSchema);
