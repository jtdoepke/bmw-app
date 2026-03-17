import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `SESSION#${id}`, SK: "META" },
      })
    );

    if (!result.Item) {
      return res.status(404).json({ error: "Session not found" });
    }

    const { sessionId, title, items, createdAt } = result.Item;
    return res.status(200).json({ sessionId, title, items, createdAt });
  } catch (err) {
    console.error("Get session error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
