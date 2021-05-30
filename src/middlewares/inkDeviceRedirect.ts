import {Request, Response, NextFunction} from 'express';

function isInkDevice(userAgent: string) {
  return userAgent.toLowerCase().indexOf('kindle') !== -1;
}

function inkDeviceRedirect(req: Request, res: Response, next: NextFunction) {
  const userAngent = req.headers['user-agent'] as string;
  if (isInkDevice(userAngent) && req.path === '/') {
    res.redirect('/ink');
  } else {
    next();
  }
}

export default inkDeviceRedirect;
