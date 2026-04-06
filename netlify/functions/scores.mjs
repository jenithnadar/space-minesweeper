import { getStore } from "@netlify/blobs";

export async function handler(event) {
  const store = getStore("scores");

  if (event.httpMethod === "GET") {
    const data = await store.get("leaderboard", { type: "json" }) || [];
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);

    let data = await store.get("leaderboard", { type: "json" }) || [];

    data.push(body);

    data.sort((a, b) => a.time - b.time);

    data = data.slice(0, 10);

    await store.set("leaderboard", data);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  }

  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };
}
