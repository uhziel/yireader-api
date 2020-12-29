import * as express from 'express';
import User from '../models/user';

const router = express.Router();

interface RegisterRes {
  ret: number;
  errors: string[];
}

router.post('/register', (req, res) => {
  const {username, password, password2} = req.body;
  const registerRes: RegisterRes = {
    ret: 1,
    errors: [],
  };
  if (!username || !password || !password2) {
    registerRes.errors.push('Please fill in all fields');
  }

  if (password !== password2) {
    registerRes.errors.push('passwords dont match');
  }

  if (password && password.length < 6) {
    registerRes.errors.push('password at least 6 characters');
  }

  if (registerRes.errors.length > 0) {
    res.send(registerRes);
    return;
  }

  User.findOne({username: username}).exec((err, user) => {
    if (user) {
      registerRes.errors.push('username already registered');
      res.send(registerRes);
      return;
    }

    const newUser = new User({
      username: username,
      password: password,
    });

    newUser
      .save()
      .then(vaule => {
        console.log(vaule);
        registerRes.ret = 0;
        res.send(registerRes);
      })
      .catch(e => console.error(e));
  });
});

export default router;
