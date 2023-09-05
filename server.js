import compress from "@fastify/compress";
import fastifyMiddie from "@fastify/middie";
import fastifyStatic from "@fastify/static";
import { load } from "cheerio";
import "dotenv/config";
import Fastify from "fastify";
import knex from "knex";
import fetch from "node-fetch";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "path";
import { handler as ssrHandler } from "./dist/server/entry.mjs";

const dbPath = join(process.cwd(), "wp-content");
if (!existsSync(dbPath)) {
  mkdirSync(dbPath);
}

const SCRIPT_HORIZONTAL =
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-ADS_PID" crossorigin="anonymous"></script> <ins class="adsbygoogle" style="display:block" data-ad-client="ca-ADS_PID" data-ad-slot="AD_SLOT" data-ad-format="auto" data-full-width-responsive="true"></ins> <script>(adsbygoogle = window.adsbygoogle || []).push({}); </script>';

const DEFAULT_CATEGORIES = [
  { name: "Bitcoin", slug: "bitcoin" },
  { name: "Coin Market", slug: "coin_market" },
  { name: "Crypto Investment", slug: "crypto_investment" },
  { name: "CryptoCurrency", slug: "crypto_currency" },
  { name: "Dogecoin", slug: "dogecoin" },
  { name: "Ethereum", slug: "ethereum" },
  { name: "Technology", slug: "technology" },
  { name: "Trading", slug: "trading" },
];

const knexIns = knex({
  client: "better-sqlite3",
  connection: { filename: join(dbPath, "data.db") },
  useNullAsDefault: true,
});

const getCategories = () => {
  const data = [];
  while (data.length < 4) {
    const category =
      DEFAULT_CATEGORIES[Math.floor(Math.random() * DEFAULT_CATEGORIES.length)];
    if (!data.some((x) => x.slug === category.slug)) {
      data.push(category);
    }
  }
  return data;
};

const tableExist = async (tbName) => {
  return await knexIns.schema.hasTable(tbName);
};

const createCategoryTableAsync = async (tbName) => {
  return new Promise((resolve) => {
    resolve(
      knexIns.schema.createTable(tbName, function (table) {
        table.increments("id").primary();
        table.string("name", 100);
        table.string("slug", 100);
        table.datetime("createdAt");
      })
    );
  });
};

const createPostTableAsync = async (tbName) => {
  return new Promise((resolve) => {
    resolve(
      knexIns.schema.createTable(tbName, function (table) {
        table.increments("id").primary();
        table.text("content");
        table.string("title", 200);
        table.string("slug", 100);
        table.string("category", 50);
        table.string("excerpt", 200);
        table.datetime("createdAt");
      })
    );
  });
};

const createAdsTableAsync = async (tbName) => {
  return new Promise((resolve) => {
    resolve(
      knexIns.schema.createTable(tbName, function (table) {
        table.increments("id").primary();
        table.string("pid", 30);
        table.string("domain", 100);
        table.jsonb("unit");
        table.datetime("createdAt");
      })
    );
  });
};

const createConfigTableAsync = async (tbName) => {
  return new Promise((resolve) => {
    resolve(
      knexIns.schema.createTable(tbName, function (table) {
        table.increments("id").primary();
        table.text("layout");
        table.string("title");
        table.string("referenceUrl");
        table.string("fontUrl");
        table.string("domainUrl");
        table.string("backgroundColor");
        table.string("headerColor");
        table.string("primaryColor");
        table.string("itemColor");
        table.string("domain");
      })
    );
  });
};

const createTablesIfNotExist = async (
  categoryTbl,
  postTbl,
  configTbl,
  adsTbl,
  configData,
  domain,
  hostname
) => {
  const categoryTblExist = await tableExist(categoryTbl);
  const postTblExist = await tableExist(postTbl);
  const configExist = await tableExist(configTbl);
  const adsExist = await tableExist(adsTbl);
  if (!categoryTblExist) {
    await createCategoryTableAsync(categoryTbl);
    await knexIns
      .insert(getCategories().map((c) => ({ ...c, createdAt: new Date() })))
      .into(categoryTbl)
      .returning("id");
  }
  if (!postTblExist) {
    await createPostTableAsync(postTbl);
  }

  if (!configExist) {
    await createConfigTableAsync(configTbl);
    await knexIns
      .insert({ ...configData, domain: hostname })
      .into(configTbl)
      .returning("id");
  }

  if (domain) {
    if (!adsExist) {
      await createAdsTableAsync(adsTbl);
      const res = await fetch(process.env.ADS_ENDPOINT + domain);
      const json = await res.json();
      const { pid, unit } = json;
      await knexIns
        .insert({ pid, unit, domain: hostname, createdAt: new Date() })
        .into("google_ads")
        .returning("id");
    } else {
      await knexIns.truncate().from("google_ads");
      const res = await fetch(process.env.ADS_ENDPOINT + domain);
      const json = await res.json();
      const { pid, unit } = json;
      await knexIns
        .insert({ pid, unit, domain: hostname, createdAt: new Date() })
        .into("google_ads")
        .returning("id");
    }
  }
};

const randomSize = (min = 1, max = 9) => {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const seedPostsFromAPI = async (categories, postTbl) => {
  const posts = await Promise.all(
    categories.map(async (c) => {
      const res = await fetch(
        process.env.POST_ENDPOINT + `${c.name}&limit=1` + randomSize()
      );
      return res.json();
    })
  );
  const newPosts = shufflePosts(posts.flat());
  const today = new Date();
  for (let index = 0; index < newPosts.length; index++) {
    const p = newPosts[index];
    const createdAt = new Date();
    createdAt.setDate(today.getDate() - index);
    const content = load(p.content);
    content("h2")
      .toArray()
      .map((c, index) => {
        switch (index) {
          case 0:
            content(c).after(
              SCRIPT_HORIZONTAL.replaceAll("AD_SLOT", "horizontal1")
            );
            return;

          case 2:
            content(c).after(
              SCRIPT_HORIZONTAL.replaceAll("AD_SLOT", "horizontal2")
            );
            return;

          case 4:
            content(c).after(
              SCRIPT_HORIZONTAL.replaceAll("AD_SLOT", "horizontal3")
            );
            return;

          case 6:
            content(c).after(
              SCRIPT_HORIZONTAL.replaceAll("AD_SLOT", "horizontal4")
            );
            return;

          default:
            return;
        }
      });

    await knexIns
      .insert({
        ...p,
        excerpt: extractExcept(p.content),
        createdAt,
        content: content.html(".aw-content"),
      })
      .into(postTbl)
      .returning("id");
  }
  for (const p of newPosts) {
  }
};

const extractExcept = (content) => {
  const $ = load(content);

  const firstH2 = $("h2")[0];
  if (firstH2) {
    let nextTag = firstH2.next;
    while (true) {
      if (nextTag.name === "p") {
        break;
      }
      nextTag = nextTag.next;
    }
    return nextTag.children[0].data;
  }
  return "";
};

const shufflePosts = (posts) => {
  const newPosts = [];

  while (posts.length) {
    var randomIndex = Math.floor(Math.random() * posts.length),
      element = posts.splice(randomIndex, 1);

    newPosts.push(element[0]);
  }
  return newPosts;
};

const app = Fastify({ logger: true });

const hostnameToTbl = (hostname) => {
  return hostname.replace(/\./g, "_").split(":")[0];
};

app.post("/reset-data", async (req, reply) => {
  try {
    const hostname = hostnameToTbl(req.hostname);
    const postTbl = hostname + "_posts";
    const categoryTbl = hostname + "_categories";
    const configsTbl = hostname + "_configs";
    const referenceTbl = "google_reference";
    const adsTbl = "google_ads";

    const postTblExist = await tableExist(postTbl);
    const configTblExist = await tableExist(configsTbl);
    const categoriesExist = await tableExist(categoryTbl);
    const adsExist = await tableExist(adsTbl);
    const referenceExist = await tableExist(referenceTbl);

    postTblExist && (await knexIns.schema.dropTable(postTbl));
    configTblExist && (await knexIns.schema.dropTable(configsTbl));
    categoriesExist && (await knexIns.schema.dropTable(categoryTbl));
    referenceExist && (await knexIns.schema.dropTable(referenceTbl));
    adsExist && (await knexIns.schema.dropTable(adsTbl));
  } catch (error) {
    return { message: "Website invalid!!!", error: error };
  }
  reply.send(req.hostname);
});

app.post("/post", async (req, reply) => {
  try {
    const hostname = hostnameToTbl(req.hostname);
    const postTbl = hostname + "_posts";
    const categoryTbl = hostname + "_categories";

    const categories = await knexIns.select("name").from(categoryTbl);
    await seedPostsFromAPI(categories, postTbl);
  } catch (error) {
    return { message: "Website invalid!!!", error: error };
  }
  reply.send(req.hostname);
});

app.delete("/post", async (req, reply) => {
  try {
    const hostname = hostnameToTbl(req.hostname);
    const postTbl = hostname + "_posts";
    await knexIns.truncate().from(postTbl);
  } catch (error) {
    return { message: "Website invalid!!!", error: error };
  }
  reply.send(req.hostname);
});

app.post("/update-config", async (req, reply) => {
  try {
    const hostname = hostnameToTbl(req.hostname);
    const configTbl = hostname + "_configs";
    await knexIns.schema.up;
    await knexIns
      .update(req.body)
      .where({ domain: req.hostname })
      .from(configTbl);
  } catch (error) {
    return { message: "Website invalid!!!", error: error };
  }
  reply.send(req.hostname);
});

//ADD WEBSITE ALREADY
app.post("/init", async (req, reply) => {
  if (process.env.POST_ENDPOINT) {
    try {
      const { domain, ...config } = req.body;
      const hostname = hostnameToTbl(req.hostname);
      const categoryTbl = hostname + "_categories";
      const postTbl = hostname + "_posts";
      const configTbl = hostname + "_configs";
      const adsTbl = "google_ads";
      await createTablesIfNotExist(
        categoryTbl,
        postTbl,
        configTbl,
        adsTbl,
        config,
        domain,
        req.hostname
      );
    } catch (error) {
      console.log("error", error);
      reply.send("error occurred");
    }
  }
  reply.send(req.hostname);
});

app.post("/init-ads", async (req, reply) => {
  if (process.env.ADS_ENDPOINT) {
    const tblExist = await tableExist("google_ads");
    try {
      const domain = req.body.domain;
      const res = await fetch(process.env.ADS_ENDPOINT + domain);
      const json = await res.json();

      const { pid, unit } = json;
      if (!tblExist) {
        await createAdsTableAsync("google_ads");
      } else {
        await knexIns.truncate().from("google_ads");
      }
      await knexIns
        .insert({ pid, unit, domain: req.hostname, createdAt: new Date() })
        .into("google_ads")
        .returning("id");
    } catch (error) {
      console.log("error", error);
      reply.send("error occurred");
    }
  }
  reply.send(req.hostname);
});

app.get("/website-info", async (req, reply) => {
  const hostname = hostnameToTbl(req.hostname);
  const postTbl = hostname + "_posts";
  const categoriesTbl = hostname + "_categories";
  const configTbl = hostname + "_configs";
  const adsTbl = "google_ads";

  const totalPost = await knexIns.count("id").from(postTbl);
  const categories = await knexIns.select("*").from(categoriesTbl);
  const ads = await knexIns
    .select("*")
    .from(adsTbl)
    .where({ domain: req.hostname })
    .first();
  const config = await knexIns
    .select("*")
    .from(configTbl)
    .where({ domain: req.hostname })
    .first();
  return {
    totalPost: totalPost[0]["count(`id`)"],
    categories,
    ads,
    config,
  };
});

// TODO REMOVE

const DEFAULT_CATEGORIES_INSURANCE = [
  { name: "Auto Insurance", slug: "auto_insurance" },
  { name: "Health Insurance", slug: "health_insurance" },
  { name: "Home Insurance", slug: "home_insurance" },
  { name: "Life Insurance", slug: "life_insurance" },
  { name: "Travel Insurance", slug: "travel_insurance" },
];
const seedPostsInsuranceFromAPI = async (categories, postTbl) => {
  const posts = await Promise.all(
    categories.map(async (c) => {
      const res = await fetch(
        process.env.POST_INSURANCE_ENDPOINT + `${c.name}&limit=24`
      );
      return res.json();
    })
  );
  const newPosts = shufflePosts(posts.flat());
  const today = new Date();
  for (let index = 0; index < newPosts.length; index++) {
    const p = newPosts[index];
    const createdAt = new Date();

    createdAt.setDate(today.getDate() - index);
    const content = load(p.content);
    content("h2")
      .toArray()
      .map((c, index) => {
        switch (index) {
          case 0:
            content(c).after(
              SCRIPT_HORIZONTAL.replaceAll("AD_SLOT", "horizontal1")
            );
            return;

          case 2:
            content(c).after(
              SCRIPT_HORIZONTAL.replaceAll("AD_SLOT", "horizontal2")
            );
            return;

          case 4:
            content(c).after(
              SCRIPT_HORIZONTAL.replaceAll("AD_SLOT", "horizontal3")
            );
            return;

          case 6:
            content(c).after(
              SCRIPT_HORIZONTAL.replaceAll("AD_SLOT", "horizontal4")
            );
            return;

          default:
            return;
        }
      });
    await knexIns
      .insert({
        ...p,
        excerpt: extractExcept(p.content),
        createdAt,
        content: content.html(".aw-content"),
      })
      .into(postTbl)
      .returning("id");
  }
  for (const p of newPosts) {
  }
};

const getCategoriesInsurance = () => {
  const data = [];
  while (data.length < 4) {
    const category =
      DEFAULT_CATEGORIES_INSURANCE[
        Math.floor(Math.random() * DEFAULT_CATEGORIES_INSURANCE.length)
      ];
    if (!data.some((x) => x.slug === category.slug)) {
      data.push(category);
    }
  }
  return data;
};

const createTablesIfNotExistInsurance = async (
  categoryTbl,
  postTbl,
  configTbl,
  adsTbl,
  configData,
  domain,
  hostname
) => {
  const categoryTblExist = await tableExist(categoryTbl);
  const postTblExist = await tableExist(postTbl);
  const configExist = await tableExist(configTbl);
  const adsExist = await tableExist(adsTbl);
  if (!categoryTblExist) {
    await createCategoryTableAsync(categoryTbl);
    await knexIns
      .insert(
        getCategoriesInsurance().map((c) => ({ ...c, createdAt: new Date() }))
      )
      .into(categoryTbl)
      .returning("id");
  }
  if (!postTblExist) {
    await createPostTableAsync(postTbl);
  }

  if (!configExist) {
    await createConfigTableAsync(configTbl);
    await knexIns
      .insert({ ...configData, domain: hostname })
      .into(configTbl)
      .returning("id");
  }

  if (domain) {
    if (!adsExist) {
      await createAdsTableAsync(adsTbl);
      const res = await fetch(process.env.ADS_ENDPOINT + domain);
      const json = await res.json();
      const { pid, unit } = json;
      await knexIns
        .insert({ pid, unit, domain: hostname, createdAt: new Date() })
        .into("google_ads")
        .returning("id");
    } else {
      await knexIns.truncate().from("google_ads");
      const res = await fetch(process.env.ADS_ENDPOINT + domain);
      const json = await res.json();
      const { pid, unit } = json;
      await knexIns
        .insert({ pid, unit, domain: hostname, createdAt: new Date() })
        .into("google_ads")
        .returning("id");
    }
  }
};

app.post("/update-pid", async (req, reply) => {
  const tblExist = await tableExist("google_ads");
  try {
    const domain = req.body.domain;
    const pid = req.body.pid;

    if (!tblExist) {
      await createAdsTableAsync("google_ads");
    } else {
      await knexIns.truncate().from("google_ads");
    }
    await knexIns
      .insert({ pid, domain: req.hostname, createdAt: new Date() })
      .into("google_ads")
      .returning("id");
  } catch (error) {
    console.log("error", error);
    reply.send("error occurred");
  }
  reply.send(req.hostname);
});

app.post("/init-insurance", async (req, reply) => {
  if (process.env.POST_ENDPOINT) {
    try {
      const { domain, ...config } = req.body;
      const hostname = hostnameToTbl(req.hostname);
      const categoryTbl = hostname + "_categories";
      const postTbl = hostname + "_posts";
      const configTbl = hostname + "_configs";
      const adsTbl = "google_ads";
      await createTablesIfNotExistInsurance(
        categoryTbl,
        postTbl,
        configTbl,
        adsTbl,
        config,
        domain,
        req.hostname
      );
    } catch (error) {
      console.log("error", error);
      reply.send("error occurred");
    }
  }
  reply.send(req.hostname);
});

app.post("/post-insurance", async (req, reply) => {
  try {
    const hostname = hostnameToTbl(req.hostname);
    const postTbl = hostname + "_posts";
    const categoryTbl = hostname + "_categories";

    const categories = await knexIns.select("name").from(categoryTbl);
    await seedPostsInsuranceFromAPI(categories, postTbl);
  } catch (error) {
    return { message: "Website invalid!!!", error: error };
  }
  reply.send(req.hostname);
});

await app
  .register(fastifyStatic, {
    root: fileURLToPath(new URL("./dist/client", import.meta.url)),
    cacheControl: true,
    maxAge: "7d",
  })
  .register(fastifyMiddie)
  .register(compress);

app.use(ssrHandler);

app.listen({ port: 3000, host: process.env.HOST || "127.0.0.1" });
