import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/connect", "/api/", "/install.sh"],
      },
    ],
    sitemap: "https://unideploy.in/sitemap.xml",
  };
}
