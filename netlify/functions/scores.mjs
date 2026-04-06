let scores = [];

export async function handler(event) {
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      body: JSON.stringify(scores)
    };
  }

  if (event.httpMethod === "POST") {
    const data = JSON.parse(event.body);

    scores.push({
      name: data.name,
      time: data.time,
      difficulty: data.difficulty
    });

    scores.sort((a, b) => a.time - b.time);
    scores = scores.slice(0, 10);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Saved" })
    };
  }

  return {
    statusCode: 405
  };
}
