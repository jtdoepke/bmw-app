import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { dynamo, TABLE } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, items } = req.body;

    if (!title || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Title and items array required" });
    }

    const cleanItems = [...new Set(items.map((i) => String(i).trim()).filter(Boolean))];

    if (cleanItems.length < 3) {
      return res.status(400).json({ error: "At least 3 unique items required" });
    }

    const sessionId = randomUUID().slice(0, 8);

    await dynamo.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `SESSION#${sessionId}`,
          SK: "META",
          sessionId,
          title,
          items: cleanItems,
          createdAt: new Date().toISOString(),
        },
      })
    );

    return res.status(201).json({ sessionId });
  } catch (err) {
    console.error("Create session error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
