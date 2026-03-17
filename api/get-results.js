import { QueryCommand } from "@aws-sdk/lib-dynamodb";
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
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `SESSION#${id}`,
          ":prefix": "RESP#",
        },
      })
    );

    const responses = (result.Items || []).map((item) => ({
      participantName: item.participantName,
      bestItem: item.bestItem,
      worstItem: item.worstItem,
      bestToOthers: item.bestToOthers,
      othersToWorst: item.othersToWorst,
      submittedAt: item.submittedAt,
    }));

    return res.status(200).json({ responses });
  } catch (err) {
    console.error("Get results error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
