let scores = [];

export async function handler(event) {

  // GET → return scores
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      body: JSON.stringify(scores)
    };
  }

  // POST → save score
  if (event.httpMethod === "POST") {
    const data = JSON.parse(event.body);

    scores.push({
      name: data.name,
      time: data.time
    });

    // Sort by best time
    scores.sort((a, b) => a.time - b.time);

    // Keep top 10
    scores = scores.slice(0, 10);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Saved" })
    };
  }

  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };
}
