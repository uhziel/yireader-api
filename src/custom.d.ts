interface UserInfo {
  id: string;
  username: string;
}

declare namespace Express {
  export interface Request {
    user?: UserInfo;
  }
}
