import {Request, Response, NextFunction} from 'express';
import {verify as verifyJWT} from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY || 'yireader';

interface JWTPayload {
  id: string;
  username: string;
}

export const jwt = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.headers['authorization'];
  if (!token) {
    next(new Error('请先登录'));
    return;
  }

  try {
    const payload = verifyJWT(token, SECRET_KEY) as JWTPayload;
    req.user = {
      id: payload.id,
      username: payload.username,
    };
    next();
  } catch (e) {
    console.error(e);
    next(e);
  }
};

export default jwt;
