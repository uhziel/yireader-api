import {Router, Request, Response, urlencoded} from 'express';
import User from '../models/User';
import {sign as signJWT} from 'jsonwebtoken';
import {compareSync} from 'bcrypt';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import flash from 'connect-flash';
import {version} from '../../package.json';
import jwtCookie from '../middlewares/jwtCookie';

const SECRET_KEY = process.env.SECRET_KEY || 'yireader';
const TOKEN_LIFETIME = '1y';

const router = Router();

router.use(
  session({
    secret: SECRET_KEY,
    name: 'sessionId',
    resave: false,
    saveUninitialized: true,
  })
);

router.use(cookieParser());

router.use(flash());

router.use((req, res, next) => {
  res.locals.successMsgs = req.flash('success');
  res.locals.failMsgs = req.flash('fail');
  next();
});

router.get('/', jwtCookie, (req, res) => {
  console.log(req.cookies);
  res.locals.user = req.user;
  res.render('index');
});

router.get('/login', (_req, res) => {
  res.render('login');
});

async function handleLogin(req: Request, res: Response) {
  const {username, password} = req.body;

  const user = await User.findOne({username: username}, 'username password');

  if (!user) {
    req.flash('fail', '用户名或密码错误，请重试。');
    res.redirect('/ink/login');
    return;
  }

  if (!compareSync(password, user.password)) {
    req.flash('fail', '用户名或密码错误，请重试。');
    res.redirect('/ink/login');
    return;
  }

  const token = signJWT({id: user.id, username: username}, SECRET_KEY, {
    expiresIn: TOKEN_LIFETIME,
  });
  res.cookie('token', token, {
    maxAge: 31536000, //1年有效期
    httpOnly: true,
  });
  res.redirect('/ink');
}

router.post('/login', urlencoded(), (req, res, next) => {
  handleLogin(req, res).catch(e => next(e));
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/ink/login');
});

router.get('/about', (_req, res) => {
  res.render('about', {
    version,
  });
});

export default router;
