import * as express from 'express';
import Debug from 'debug';

const debug = Debug('yireader:debugRouter');

const router = express.Router();

router.get('/', (req, res) => {
  const headersText = JSON.stringify(req.headers, null, 4);
  debug('req.headers: %s', headersText);
  res.send(`<pre>${headersText}</pre>`);
});

export default router;
