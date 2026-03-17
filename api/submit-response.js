import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { dynamo, TABLE } from "./_db.js";

function isIntInRange(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

function validateRatings(ratings, expectedKeys) {
  if (typeof ratings !== "object" || ratings === null || Array.isArray(ratings)) {
    return "must be an object";
  }
  const keys = Object.keys(ratings);
  if (keys.length !== expectedKeys.length || !expectedKeys.every((k) => keys.includes(k))) {
    return "keys do not match expected items";
  }
  for (const k of keys) {
    if (!isIntInRange(ratings[k], 1, 9)) {
      return `rating for "${k}" must be an integer from 1 to 9`;
    }
  }
  return null;
}

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

    // Fetch session to validate items
    const session = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `SESSION#${sessionId}`, SK: "META" },
      })
    );

    if (!session.Item) {
      return res.status(404).json({ error: "Session not found" });
    }

    const { items } = session.Item;

    if (!items.includes(bestItem)) {
      return res.status(400).json({ error: "bestItem is not in this session's items" });
    }
    if (!items.includes(worstItem)) {
      return res.status(400).json({ error: "worstItem is not in this session's items" });
    }
    if (bestItem === worstItem) {
      return res.status(400).json({ error: "bestItem and worstItem must be different" });
    }

    const bestToOthersKeys = items.filter((i) => i !== bestItem);
    const err1 = validateRatings(bestToOthers, bestToOthersKeys);
    if (err1) {
      return res.status(400).json({ error: `bestToOthers: ${err1}` });
    }

    const othersToWorstKeys = items.filter((i) => i !== worstItem);
    const err2 = validateRatings(othersToWorst, othersToWorstKeys);
    if (err2) {
      return res.status(400).json({ error: `othersToWorst: ${err2}` });
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
