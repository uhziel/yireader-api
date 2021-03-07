import * as express from 'express';
import {version} from '../../package.json';

const router = express.Router();

router.get('/', (_req, res) => {
  const configMongodbUri = !!process.env.MONGODB_URI;
  res.json({version, configMongodbUri});
});

export default router;
