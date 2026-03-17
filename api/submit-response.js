import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { dynamo, TABLE } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sessionId, participantName, bestItem, worstItem, bestToOthers, othersToWorst } =
      req.body;

    if (!sessionId || !participantName || !bestItem || !worstItem || !bestToOthers || !othersToWorst) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const participantId = randomUUID().slice(0, 12);

    await dynamo.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `SESSION#${sessionId}`,
          SK: `RESP#${participantId}`,
          participantName,
          bestItem,
          worstItem,
          bestToOthers,
          othersToWorst,
          submittedAt: new Date().toISOString(),
        },
      })
    );

    return res.status(201).json({ participantId });
  } catch (err) {
    console.error("Submit response error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
