import {Schema, Document, model} from 'mongoose';

// 还没开始使用。这里只是设计了下其 schema。
// mongoose 只有在插入记录时才会真正遵照这里的 scheme 插入数据。

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
