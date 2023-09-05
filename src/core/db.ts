import knex from "knex";
import { join } from "path";

const knexIns = knex({
  client: "better-sqlite3",
  connection: {
    filename: join(process.cwd(), "wp-content", "data.db"),
  },
  useNullAsDefault: true,
});

export const getAdsByHost = async (hostname: string) => {
  return knexIns.schema
    .hasTable("google_ads")
    .then((value) =>
      value
        ? knexIns
            .select("*")
            .from("google_ads")
            .where({ domain: hostname })
            .first()
        : undefined
    );
};

export const getReferenceByHost = async (hostname: string) => {
  const tbl = hostnameToTbl(hostname) + "_configs";
  return knexIns.schema
    .hasTable(tbl)
    .then((value) =>
      value
        ? knexIns.select("*").from(tbl).where({ domain: hostname }).first()
        : undefined
    );
};

export const getConfigByHost = async (hostname: string) => {
  const tbl = hostnameToTbl(hostname) + "_configs";
  return knexIns.schema
    .hasTable(tbl)
    .then((value) =>
      value
        ? knexIns.select("*").from(tbl).where({ domain: hostname }).first()
        : undefined
    );
};

export const getRecentPostsByHost = async (hostname: string) => {
  const mHost = hostnameToTbl(hostname);
  const postTbl = "127_0_0_1" + "_posts";

  return knexIns
    .select<IPost[]>("slug", "title", "createdAt")
    .from(postTbl)
    .orderBy("createdAt", "desc")
    .limit(5)
    .offset(5);
};

export const getRecommendedPostsByHost = async (hostname: string) => {
  const mHost = hostnameToTbl(hostname);
  const postTbl = "127_0_0_1" + "_posts";
  return knexIns
    .select<IPost[]>("slug", "title", "createdAt")
    .from(postTbl)
    .orderByRaw("RANDOM()")
    .limit(5);
};

export const getCategoriesByHost = async (hostname: string) => {
  const mHost = hostnameToTbl(hostname);
  const categoryTbl = "127_0_0_1" + "_categories";
  const categories = await knexIns
    .select<ICategory[]>("slug", "name")
    .from(categoryTbl);
  return categories;
};

export const getPostByHost = async (
  hostname: string,
  pathname: string,
  limit: number,
  offset: number
) => {
  const mHost = hostnameToTbl(hostname);
  const postTbl = "127_0_0_1" + "_posts";
  console.log(postTbl);

  if (pathname !== "/" && pathname !== "") {
    const [post] = await knexIns
      .select("*")
      .from(postTbl)
      .where({ slug: pathname.split("/").pop() })
      .limit(1);
    return { data: post };
  }

  const totalRecords = await knexIns.count("id").from(postTbl);
  const posts = await knexIns
    .select("*")
    .from(postTbl)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .offset(offset);
  return {
    data: posts,
    totalRecords: Number(totalRecords[0]["count(`id`)"]) || 0,
  };
};

export const getPostByCategoryByHost = async (
  hostname: string,
  pathname: string,
  limit: number,
  offset: number
) => {
  const mHost = hostnameToTbl(hostname);
  const categoryTbl = "127_0_0_1" + "_categories";
  const postTbl = "127_0_0_1" + "_posts";
  console.log(knexIns);
  const category = await knexIns
    .select("name")
    .from(categoryTbl)
    .where({ slug: pathname.split("/").pop() })
    .first();
  if (!category) {
    return { data: [], totalRecords: 0 };
  }

  const totalRecords = await knexIns
    .count("id")
    .from(postTbl)
    .where({ category: category.name });
  const posts = await knexIns
    .select("*")
    .from(postTbl)
    .where({ category: category.name })
    .orderBy("createdAt", "desc")
    .limit(limit)
    .offset(offset);
  return {
    data: posts,
    totalRecords: Number(totalRecords[0]["count(`id`)"]) || 0,
  };
};

const hostnameToTbl = (hostname: string) => {
  return hostname.replace(/\./g, "_");
};
