import {Schema, Document, model} from 'mongoose';
export interface BookChapterInterface extends Document {
  name: string;
  url: string;
  firstAccessedAt?: Date;
  data: string;
}

const bookChapterSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  firstAccessedAt: {
    type: Date,
  },
  data: {
    type: String,
    required: true,
  },
});

export default model<BookChapterInterface>('BookChapter', bookChapterSchema);
