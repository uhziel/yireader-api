import * as express from 'express';
import {version} from '../../package.json';

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({version});
});

export default router;
