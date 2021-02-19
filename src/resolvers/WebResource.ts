import WebResource from '../models/WebResource';
import axios from 'axios';

interface WebResourceInput {
  url: string;
}

export const webResources = async () => {
  const webResources = await WebResource.find({});
  return webResources;
};

export const webResource = async (args: WebResourceInput) => {
  return await WebResource.findOne({url: args.url});
};

export const createWebResource = async (args: WebResourceInput) => {
  const response = await axios.get(args.url, {
    responseType: 'arraybuffer',
  });

  const webResource = new WebResource({
    url: args.url,
    mediaType: response.headers['content-type'],
    blob: response.data,
  });
  await webResource.save();
  return webResource;
};
