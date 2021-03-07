import WebResource from '../models/WebResource';
import axios from 'axios';
import {Types} from 'mongoose';

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

export async function _createWebResource(url: string, id?: Types.ObjectId) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  const webResource = new WebResource({
    _id: id,
    url,
    mediaType: response.headers['content-type'],
    blob: response.data,
  });
  await webResource.save();
  return webResource;
}

export const createWebResource = async (args: WebResourceInput) => {
  return _createWebResource(args.url);
};
