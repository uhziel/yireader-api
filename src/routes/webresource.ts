import * as express from 'express';
import WebResource from '../models/WebResource';

const router = express.Router();

async function handleWebResource(req: express.Request, res: express.Response) {
  const webResourceId = req.params.webResourceId;
  const webResource = await WebResource.findById(webResourceId);
  if (!webResource) {
    throw new Error(`未发现网络资源 id:${webResourceId}`);
  }

  res.status(200);
  res.set('Content-Type', webResource.mediaType);
  res.set('Cache-Control', 'max-age=31536000'); //1年有效期
  res.send(webResource.blob);
}

router.get('/:webResourceId', (req, res, next) => {
  handleWebResource(req, res).catch(next);
});

export default router;
