import {Schema, Document, model} from 'mongoose';

export interface BookSourceInterface extends Document {
  downloadUrl: string;
  name: string;
  url: string;
  version: number;
  data: string;
  lastFetchTime: Date;
  enableSearch: boolean;
}

const bookSourceSchema = new Schema({
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
  lastFetchTime: {
    type: Date,
    default: Date.now,
  },
  enableSearch: {
    type: Boolean,
    default: false,
  },
});

export default model<BookSourceInterface>('BookSource', bookSourceSchema);
