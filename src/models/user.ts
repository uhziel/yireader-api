import {Schema, model} from 'mongoose';

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

const User = model('User', UserSchema);
export default User;
