const urls = [
  "https://wippapp.com/.well-known/assetlinks.json",
  "https://wippapp.com/.well-known/apple-app-site-association",
  "https://wippapp.com/api/wipp/nearby/visibility",
];
for (const url of urls) {
  try {
    const res = await fetch(url, { headers: { authorization: "Bearer probe" } });
    const text = await res.text();
    console.log(`URL ${url}`);
    console.log(`STATUS ${res.status}`);
    console.log(text.slice(0, 800));
    console.log("---");
  } catch (err) {
    console.log(`URL ${url}`);
    console.log(`ERROR ${err instanceof Error ? err.message : String(err)}`);
    console.log("---");
  }
}
console.log(`VERCEL_TOKEN ${process.env.VERCEL_TOKEN ? "set" : "absent"}`);
