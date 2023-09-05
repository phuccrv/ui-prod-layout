import { writeFileSync } from "fs";
import fetch from "node-fetch";
import { join } from "path";

const ENDPOINT =
  "https://ebookuk.online/wp-json/wp/v2/posts?page=&per_page=25&_fields[]=title&_fields[]=excerpt&_fields[]=slug&_fields[]=modified&_fields[]=content&_fields[]=author&_fields[]=categories";

const CATEGORY_ENDPOINT =
  "https://ebookuk.online/wp-json/wp/v2/categories/id?_fields[]=name";

const AUTHOR_ENDPOINT = "https://ebookuk.online/wp-json/wp/v2/users/id";

const authorMap = new Map();
const categoryMap = new Map();

const doFetch = async (url) => {
  // console.log('url', url)
  const res = await fetch(url);
  const json = await res.json();
  return json;
};

const bootstrap = async () => {
  const posts = [];
  for (let index = 1; index < 5; index++) {
    const json = await doFetch(ENDPOINT.replace("page=", "page=" + index));

    for (const j of json) {
      if (authorMap.has(j.author)) {
        j.author = authorMap.get(j.author);
      } else {
        try {
          const author = await doFetch(AUTHOR_ENDPOINT.replace("id", j.author));
          authorMap.set(j.author, { name: author.name });
          j.author = { name: author.name };
        } catch {
          authorMap.set(j.author, { name: "admin" });
          j.author = { name: "admin" };
        }
      }

      if (categoryMap.has(j.categories[0])) {
        j.category = categoryMap.get(j.categories[0]);
      } else {
        const category = await doFetch(
          CATEGORY_ENDPOINT.replace("id", j.categories[0])
        );
        categoryMap.set(j.categories[0], category);
        j.category = category;
      }
    }
    posts.push(...json);
    // console.log('fetch page', index, 'completed at', new Date().toLocaleString())
  }

  writeFileSync(
    join(process.cwd(), "wp-content", "data.json"),
    JSON.stringify(posts),
    "utf-8"
  );
  // console.log('bootstrap', 'finished')
};

bootstrap();
