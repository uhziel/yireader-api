import {Schema, Model, Document, model} from 'mongoose';

interface UserInterface extends Document {
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

const User: Model<UserInterface> = model('User', UserSchema);
export default User;
