import * as express from 'express';
import {version} from '../../package.json';

const router = express.Router();

router.get('/', (_req, res) => {
  res.render('index');
});

router.get('/about', (_req, res) => {
  res.render('about', {
    version,
  });
});

export default router;
