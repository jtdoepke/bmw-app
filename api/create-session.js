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

    // Normalize items to { title, description } objects, deduplicate by title
    const seen = new Map();
    for (const item of items) {
      if (typeof item !== "object" || !item || !item.title) continue;
      const t = String(item.title).trim();
      if (!t) continue;
      const desc = String(item.description || "").trim().slice(0, 1000);
      seen.set(t, { title: t, description: desc });
    }
    const cleanItems = [...seen.values()];

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
