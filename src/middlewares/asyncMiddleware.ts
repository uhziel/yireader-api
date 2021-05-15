import {Request, Response, NextFunction} from 'express';

type funcType = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void>;

export function asyncMiddleware(func: funcType) {
  return (req: Request, res: Response, next: NextFunction) => {
    func(req, res, next).catch(e => next(e));
  };
}

export default asyncMiddleware;
