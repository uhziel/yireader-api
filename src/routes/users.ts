import * as express from 'express';
import User from '../models/user';
import {sign as signJWT} from 'jsonwebtoken';
import {hashSync, compareSync} from 'bcrypt';

const SALT_ROUNDS = 8;

const router = express.Router();

interface RegisterRes {
  ret: number;
  errors: string[];
  token: string;
  username: string;
}

interface LoginRes {
  ret: number;
  error: string;
  token: string;
  username: string;
}

router.post('/register', (req, res) => {
  const {username, password, password_confirmation} = req.body;
  const registerRes: RegisterRes = {
    ret: 1,
    errors: [],
    token: '',
    username: '',
  };
  if (!username || !password || !password_confirmation) {
    registerRes.errors.push('Please fill in all fields');
  }

  if (password !== password_confirmation) {
    registerRes.errors.push('passwords dont match');
  }

  if (password && password.length < 6) {
    registerRes.errors.push('password at least 6 characters');
  }

  if (registerRes.errors.length > 0) {
    res.send(registerRes);
    return;
  }

  const passwordAfterHash = hashSync(password, SALT_ROUNDS);

  User.findOne({username: username}).exec((err, user) => {
    if (user) {
      registerRes.errors.push('username already registered');
      res.send(registerRes);
      return;
    }

    const newUser = new User({
      username: username,
      password: passwordAfterHash,
    });

    newUser
      .save()
      .then(user => {
        console.log(user);
        registerRes.ret = 0;
        registerRes.token = signJWT(
          {id: user.id, username: username},
          'hhhhh',
          {
            expiresIn: '24h',
          }
        );
        registerRes.username = username;
        res.send(registerRes);
      })
      .catch(e => console.error(e));
  });
});

router.post('/login', (req, res) => {
  const {username, password} = req.body;
  const loginRes: LoginRes = {
    ret: 1,
    error: '',
    token: '',
    username: '',
  };
  User.findOne({username: username}).exec((err, user) => {
    if (err) {
      loginRes.error = 'User findOne error.';
      res.send(loginRes);
      return;
    }
    if (!user) {
      loginRes.error = 'User no found.';
      res.send(loginRes);
      return;
    }

    if (!compareSync(password, user.password)) {
      loginRes.error = 'password error.';
      res.send(loginRes);
      return;
    }

    loginRes.ret = 0;
    loginRes.token = signJWT({id: user.id, username: username}, 'hhhhh', {
      expiresIn: '24h',
    });
    loginRes.username = username;
    res.send(loginRes);
  });
});

export default router;
