import { getRegion } from './_regions.js';

export default async function handler(req, res) {
  const KEY = process.env.NEWS_API_KEY;
  const region = getRegion(req);
  const query = encodeURIComponent(region.news);
  const response = await fetch(`https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=20&apiKey=${KEY}`);
  const data = await response.json();
  res.json(data);
}
