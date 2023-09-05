import {
  getAdsByHost,
  getCategoriesByHost,
  getConfigByHost,
  getPostByCategoryByHost,
  getPostByHost,
  getRecentPostsByHost,
  getRecommendedPostsByHost,
  getReferenceByHost,
} from "./db";

const pageSize = 10;

export const getPosts = async (hostname = "", pathname = "", page = "1") => {
  const start = (parseInt(page) - 1) * pageSize;
  return getPostByHost(hostname, pathname, pageSize, start);
};

export const getPostsByCategory = async (
  hostname = "",
  pathname = "",
  page = "1"
) => {
  const start = (parseInt(page) - 1) * pageSize;
  return getPostByCategoryByHost(hostname, pathname, pageSize, start);
};

export const getCategories = async (hostname = "") => {
  return getCategoriesByHost(hostname);
};

export const getRecentPosts = async (hostname = "") => {
  return getRecentPostsByHost(hostname);
};

export const getRecommendedPosts = async (hostname = "") => {
  return getRecommendedPostsByHost(hostname);
};

export const getAds = async (hostname = "") => {
  const ads = await getAdsByHost(hostname);
  if (ads) {
    const unit = JSON.parse(ads?.unit);
    return { ...ads, unit } as IAds;
  }
  return undefined;
};

export const getReference = async (hostname = "") => {
  const config = await getReferenceByHost(hostname);
  return config?.referenceUrl?.toString() || "";
};

export const getConfigLayout = async (hostname = "") => {
  const config = await getConfigByHost(hostname);
  if (config) return config as IConfig;
  return undefined;
};
