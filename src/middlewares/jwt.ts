import {Request, Response, NextFunction} from 'express';

export const jwt = (req: Request, _res: Response, next: NextFunction) => {
  const user = {
    id: '5ffa668fe5d19bfe311f1a97',
    username: 'user102',
  };
  req.user = user;
  next();
};

export default jwt;
