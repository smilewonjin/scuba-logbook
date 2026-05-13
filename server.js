import express from "express";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";
import { TableClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";

const app = express();
const PORT = process.env.PORT || 8080;

const TABLE_NAME = "divelogs";
const BLOB_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || "divephotos";
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

const upload = multer({ storage: multer.memoryStorage() });

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

function createBlobContainerClient() {
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return blobServiceClient.getContainerClient(BLOB_CONTAINER_NAME);
}

app.get("/api/logs", async (req, res) => {
  try {
    const client = createTableClient();
    await client.createTable();

    const logs = [];

    for await (const entity of client.listEntities({
      queryOptions: { filter: `PartitionKey eq 'DiveLog'` },
    })) {
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
        photoUrl: entity.photoUrl,
        createdAt: entity.createdAt,
      });
    }

    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ logs });
  } catch (error) {
    console.error("GET /api/logs failed:", error);
    res.status(500).json({ message: "Failed to load logs", error: error.message });
  }
});

app.post("/api/logs", upload.single("photo"), async (req, res) => {
  try {
    const tableClient = createTableClient();
    await tableClient.createTable();

    let photoUrl = "";

    if (req.file) {
      const containerClient = createBlobContainerClient();
      await containerClient.createIfNotExists();

      const extension = path.extname(req.file.originalname) || ".jpg";
      const blobName = `${crypto.randomUUID()}${extension}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype,
        },
      });

      photoUrl = blockBlobClient.url;
    }

    const now = new Date().toISOString();

    const entity = {
      partitionKey: "DiveLog",
      rowKey: crypto.randomUUID(),
      date: req.body.date || "",
      location: req.body.location || "",
      diveSite: req.body.diveSite || "",
      maxDepth: req.body.maxDepth || "",
      bottomTime: req.body.bottomTime || "",
      waterTemp: req.body.waterTemp || "",
      visibility: req.body.visibility || "",
      buddy: req.body.buddy || "",
      memo: req.body.memo || "",
      photoUrl,
      createdAt: now,
    };

    await tableClient.createEntity(entity);

    res.status(201).json({ message: "Dive log saved" });
  } catch (error) {
    console.error("POST /api/logs failed:", error);
    res.status(500).json({ message: "Failed to save log", error: error.message });
  }
});

app.delete("/api/logs/:rowKey", async (req, res) => {
  try {
    const client = createTableClient();
    await client.deleteEntity("DiveLog", req.params.rowKey);
    res.json({ message: "Dive log deleted" });
  } catch (error) {
    console.error("DELETE /api/logs failed:", error);
    res.status(500).json({ message: "Failed to delete log", error: error.message });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});