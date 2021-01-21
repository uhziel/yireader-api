import {Schema, Document, model} from 'mongoose';

export interface BookFileInterface extends Document {
  format: string; // 取值见 https://manual.calibre-ebook.com/faq.html#id9
  data: Buffer;
}

const bookFileSchema = new Schema({
  format: {
    type: String,
    required: true,
  },
  data: Buffer,
});

export default model<BookFileInterface>('BookFile', bookFileSchema);
