import {Schema, Document, model} from 'mongoose';

export interface BookSourceInterface extends Document {
  name: string;
  url: string;
  data: string;
  lastFetchTime: Date;
  enableSearch: boolean;
}

const BookSourceSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  data: {
    type: String,
    required: true,
  },
  lastFetchTime: {
    type: Date,
    default: Date.now,
  },
  enableSearch: {
    type: Boolean,
    default: false,
  },
});

export default model<BookSourceInterface>('BookSource', BookSourceSchema);
