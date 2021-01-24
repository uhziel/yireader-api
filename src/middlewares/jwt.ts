import {Request, Response, NextFunction} from 'express';

export const jwt = (req: Request, _res: Response, next: NextFunction) => {
  const user = {
    id: '5ff9cbbd41703a3b6750fc18',
    username: 'user101',
  };
  req.user = user;
  next();
};

export default jwt;
