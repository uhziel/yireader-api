import {Request, Response, NextFunction} from 'express';

export const jwt = (req: Request, _res: Response, next: NextFunction) => {
  const user = {
    id: '5ffac0357384c5288c64f33f',
    username: 'user103',
  };
  req.user = user;
  next();
};

export default jwt;
