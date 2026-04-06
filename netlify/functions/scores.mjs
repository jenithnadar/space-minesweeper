let scores = [];

export async function handler(event) {
  if (event.httpMethod === 'GET') {
    const difficulty = event.queryStringParameters?.difficulty;

    const filtered = difficulty
      ? scores.filter(s => s.difficulty === difficulty)
      : scores;

    return {
      statusCode: 200,
      body: JSON.stringify(filtered.sort((a, b) => a.time - b.time).slice(0, 10)),
    };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);

    scores.push({
      name: body.name,
      time: body.time,
      difficulty: body.difficulty,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed',
  };
}
