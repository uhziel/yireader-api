import {Schema, Document, model} from 'mongoose';

export interface WebResourceInterface extends Document {
  mediaType: string; // https://en.wikipedia.org/wiki/Media_type
  url: string;
  blob: Buffer;
}

const webResourceSchema = new Schema({
  mediaType: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  blob: {
    type: Buffer,
    required: true,
  },
});

export default model<WebResourceInterface>('WebResource', webResourceSchema);
