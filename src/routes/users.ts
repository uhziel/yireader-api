import * as express from 'express';
import User from '../models/user';
import {sign as signJWT} from 'jsonwebtoken';
import {hashSync, compareSync} from 'bcrypt';

const SALT_ROUNDS = 8;
const SECRET_KEY = process.env.SECRET_KEY || 'yireader';

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
    registerRes.errors.push('请填充所有选项。');
  }

  if (password !== password_confirmation) {
    registerRes.errors.push('密码不匹配。');
  }

  if (password && password.length < 6) {
    registerRes.errors.push('密码至少需要6位。');
  }

  if (registerRes.errors.length > 0) {
    res.send(registerRes);
    return;
  }

  const passwordAfterHash = hashSync(password, SALT_ROUNDS);

  User.findOne({username: username}).exec((err, user) => {
    if (user) {
      registerRes.errors.push('该用户名已经被注册。');
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
          SECRET_KEY,
          {
            expiresIn: '24h',
          }
        );
        registerRes.username = username;
        res.send(registerRes);
      })
      .catch(e => {
        console.error(e);
        registerRes.errors.push('内部错误。');
        res.send(registerRes);
        return;
      });
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
      loginRes.error = '内部错误。';
      res.send(loginRes);
      return;
    }
    if (!user) {
      loginRes.error = '用户名或密码错误，请重试。';
      res.send(loginRes);
      return;
    }

    if (!compareSync(password, user.password)) {
      loginRes.error = '用户名或密码错误，请重试。';
      res.send(loginRes);
      return;
    }

    loginRes.ret = 0;
    loginRes.token = signJWT({id: user.id, username: username}, SECRET_KEY, {
      expiresIn: '24h',
    });
    loginRes.username = username;
    res.send(loginRes);
  });
});

interface ChangePasswordRes {
  ret: number;
  error: string;
  success: string;
}

router.post('/changepassword', (req, res) => {
  const {username, password, newPassword, newPasswordConfirmation} = req.body;
  const result: ChangePasswordRes = {
    ret: 1,
    error: '',
    success: '',
  };
  User.findOne({username: username}).exec((err, user) => {
    if (err) {
      result.error = '内部错误。';
      res.send(result);
      return;
    }
    if (!user) {
      result.error = '内部错误。';
      res.send(result);
      return;
    }

    if (newPassword && newPassword.length < 6) {
      result.error = '新密码至少需要6位。';
      res.send(result);
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      result.error = '新密码不匹配。';
      res.send(result);
      return;
    }

    if (!compareSync(password, user.password)) {
      result.error = '当前密码错误，请重试。';
      res.send(result);
      return;
    }

    const passwordAfterHash = hashSync(newPassword, SALT_ROUNDS);
    user.password = passwordAfterHash;
    user
      .save()
      .then(user => {
        console.log(user);
        result.ret = 0;
        result.success = '修改密码成功。';
        res.send(result);
      })
      .catch(e => {
        console.error(e);
        result.error = '内部错误。';
        res.send(result);
      });
  });
});

export default router;
