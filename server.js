import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";

const app = express();
const PORT = process.env.PORT || 8080;

const TABLE_NAME = "diveLogs";
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

function createTableClient() {
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }

  return TableClient.fromConnectionString(connectionString, TABLE_NAME);
}

app.get("/api/logs", async (req, res) => {
  try {
    const client = createTableClient();
    await client.createTable();

    const logs = [];
    const entities = client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq 'DiveLog'`,
      },
    });

    for await (const entity of entities) {
      logs.push({
        rowKey: entity.rowKey,
        date: entity.date,
        location: entity.location,
        diveSite: entity.diveSite,
        maxDepth: entity.maxDepth,
        bottomTime: entity.bottomTime,
        waterTemp: entity.waterTemp,
        visibility: entity.visibility,
        buddy: entity.buddy,
        memo: entity.memo,
        createdAt: entity.createdAt,
      });
    }

    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ logs });
  } catch (error) {
    console.error("GET /api/logs failed:", error);
    res.status(500).json({
      message: "Failed to load logs",
      error: error.message,
    });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const client = createTableClient();
    await client.createTable();

    const body = req.body;
    const now = new Date().toISOString();

    const entity = {
      partitionKey: "DiveLog",
      rowKey: crypto.randomUUID(),
      date: body.date || "",
      location: body.location || "",
      diveSite: body.diveSite || "",
      maxDepth: body.maxDepth || "",
      bottomTime: body.bottomTime || "",
      waterTemp: body.waterTemp || "",
      visibility: body.visibility || "",
      buddy: body.buddy || "",
      memo: body.memo || "",
      createdAt: now,
    };

    await client.createEntity(entity);

    res.status(201).json({
      message: "Dive log saved",
      log: {
        rowKey: entity.rowKey,
        ...body,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error("POST /api/logs failed:", error);
    res.status(500).json({
      message: "Failed to save log",
      error: error.message,
    });
  }
});

app.delete("/api/logs/:rowKey", async (req, res) => {
  try {
    const client = createTableClient();
    await client.deleteEntity("DiveLog", req.params.rowKey);

    res.json({
      message: "Dive log deleted",
    });
  } catch (error) {
    console.error("DELETE /api/logs failed:", error);
    res.status(500).json({
      message: "Failed to delete log",
      error: error.message,
    });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
