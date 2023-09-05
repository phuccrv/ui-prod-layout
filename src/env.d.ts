/// <reference types="astro/client" />

declare interface IPost {
  title: string;
  excerpt: string;
  content: string;
  slug: string;
  createdAt: string;
  categories: number[];
  category: { name: string };
  author: { name: string };
}

declare interface ICategory {
  name: string;
  slug: string;
}

declare interface IAds {
  pid: string;
  unit: { [key: string]: string };
  domain: string;
}

declare interface IConfig {
  layout?: string;
  referenceUrl?: string;
  fontUrl?: string;
  domainUrl?: string;
  backgroundColor?: string;
  headerColor?: string;
  primaryColor?: string;
  itemColor?: string;
  domain?: string;
}
