import {Schema, Document, model} from 'mongoose';

export interface UserInterface extends Document {
  username: string;
  password: string;
}

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  createData: {
    type: Date,
    default: Date.now,
  },
});

export default model<UserInterface>('User', UserSchema);
