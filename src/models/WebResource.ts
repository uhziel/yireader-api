import {Schema, Document, model} from 'mongoose';

export interface WebResourceInterface extends Document {
  mediaType: string; // https://en.wikipedia.org/wiki/Media_type
  url: string;
  data: Buffer;
}

const WebResourceSchema = new Schema({
  mediaType: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  data: Buffer,
});

export default model<WebResourceInterface>('WebResource', WebResourceSchema);
