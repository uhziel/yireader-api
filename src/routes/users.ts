import {Router, Request, Response} from 'express';
import User from '../models/User';
import {sign as signJWT} from 'jsonwebtoken';
import {hashSync, compareSync} from 'bcrypt';

const SALT_ROUNDS = 8;
const SECRET_KEY = process.env.SECRET_KEY || 'yireader';

const router = Router();

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

async function handleRegister(req: Request, res: Response) {
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

  const isExist = await User.exists({username: username});

  if (isExist) {
    registerRes.errors.push('该用户名已经被注册。');
    res.send(registerRes);
    return;
  }

  const newUser = new User({
    username: username,
    password: passwordAfterHash,
  });

  await newUser.save();

  registerRes.ret = 0;
  registerRes.token = signJWT(
    {id: newUser.id, username: username},
    SECRET_KEY,
    {
      expiresIn: '24h',
    }
  );
  registerRes.username = username;
  res.send(registerRes);
}

router.post('/register', async (req, res, next) => {
  handleRegister(req, res).catch(e => next(e));
});

async function handleLogin(req: Request, res: Response) {
  const {username, password} = req.body;
  const loginRes: LoginRes = {
    ret: 1,
    error: '',
    token: '',
    username: '',
  };

  const user = await User.findOne({username: username}, 'username password');

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
}

router.post('/login', (req, res, next) => {
  handleLogin(req, res).catch(e => next(e));
});

interface ChangePasswordRes {
  ret: number;
  error: string;
  success: string;
}

async function handleChangePassword(req: Request, res: Response) {
  const {username, password, newPassword, newPasswordConfirmation} = req.body;
  const result: ChangePasswordRes = {
    ret: 1,
    error: '',
    success: '',
  };
  const user = await User.findOne({username: username}, 'username password');

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
  await user.save();
  result.ret = 0;
  result.success = '修改密码成功。';
  res.send(result);
}

router.post('/changepassword', (req, res, next) => {
  handleChangePassword(req, res).catch(e => next(e));
});

export default router;
