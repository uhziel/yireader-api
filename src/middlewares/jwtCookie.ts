import {Request, Response, NextFunction} from 'express';
import {verify as verifyJWT} from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY || 'yireader';

interface JWTPayload {
  id: string;
  username: string;
}

export const jwtCookie = (req: Request, res: Response, next: NextFunction) => {
  const p = new Promise((resolve, reject) => {
    const token = req.cookies['token'] as string;
    if (!token) {
      res.redirect('/ink/login');
      reject(new Error('请先登录'));
      return;
    }

    verifyJWT(token, SECRET_KEY, (e, data) => {
      if (e) {
        res.redirect('/ink/login');
        reject(e);
        return;
      }
      const payload = data as JWTPayload;

      req.user = {
        id: payload.id,
        username: payload.username,
      };
      resolve(null);
    });
  });

  p.then(next, next);
};

export default jwtCookie;
