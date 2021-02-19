import {Schema, Document, model} from 'mongoose';

export interface AuthorInterface extends Document {
  name: string;
}

const authorSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
});

export default model<AuthorInterface>('Author', authorSchema);
