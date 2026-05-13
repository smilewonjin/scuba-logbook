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

function getUser(req) {
  const header = req.headers["x-ms-client-principal"];

  if (!header) {
    return null;
  }

  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const principal = JSON.parse(decoded);

    const claims = principal.claims || [];

    const emailClaim =
      claims.find((claim) => claim.typ === "emails") ||
      claims.find((claim) => claim.typ === "email") ||
      claims.find((claim) => claim.typ?.endsWith("/emailaddress"));

    const nameClaim =
      claims.find((claim) => claim.typ === "name") ||
      claims.find((claim) => claim.typ?.endsWith("/name"));

    return {
      userId: principal.userId || principal.userDetails || "",
      userEmail: emailClaim?.val || principal.userDetails || "",
      userName: nameClaim?.val || principal.userDetails || "",
      identityProvider: principal.identityProvider || "",
    };
  } catch (error) {
    console.error("Failed to parse x-ms-client-principal:", error);
    return null;
  }
}

function requireLogin(req, res) {
  const user = getUser(req);

  if (!user || !user.userId) {
    res.status(401).json({
      message: "Login required",
    });
    return null;
  }

  return user;
}

function sanitizePartitionKey(value) {
  return String(value || "unknown")
    .replace(/[\\/#?]/g, "_")
    .slice(0, 200);
}

function getUserPartitionKey(user) {
  return `DiveLog_${sanitizePartitionKey(user.userId)}`;
}

async function uploadPhotoIfExists(file) {
  if (!file) return "";

  const containerClient = createBlobContainerClient();
  await containerClient.createIfNotExists();

  const extension = path.extname(file.originalname) || ".jpg";
  const blobName = `${crypto.randomUUID()}${extension}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype,
    },
  });

  return blockBlobClient.url;
}

function buildEntity(body, rowKey, photoUrl, createdAt, user) {
  return {
    partitionKey: getUserPartitionKey(user),
    rowKey,

    userId: user.userId || "",
    userEmail: user.userEmail || "",
    userName: user.userName || "",

    date: body.date || "",
    location: body.location || "",
    diveSite: body.diveSite || "",
    diveNumber: body.diveNumber || "1",

    buddy: body.buddy || "",
    shop: body.shop || "",

    startTime: body.startTime || "",
    endTime: body.endTime || "",
    surfaceInterval: body.surfaceInterval || "",

    maxDepth: body.maxDepth || "",
    avgDepth: body.avgDepth || "",
    bottomTime: body.bottomTime || "",
    waterTemp: body.waterTemp || "",
    visibility: body.visibility || "",
    current: body.current || "",
    wave: body.wave || "",
    weather: body.weather || "",
    entryType: body.entryType || "",

    startPressure: body.startPressure || "",
    endPressure: body.endPressure || "",
    tankType: body.tankType || "",
    tankSize: body.tankSize || "",
    gasType: body.gasType || "",

    residualNitrogen: body.residualNitrogen || "",
    planFollowed: body.planFollowed || "",

    equipmentChecklist: body.equipmentChecklist || "{}",
    planChecklist: body.planChecklist || "{}",

    memo: body.memo || "",
    photoUrl: photoUrl || "",

    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapEntity(entity) {
  return {
    partitionKey: entity.partitionKey,
    rowKey: entity.rowKey,

    userId: entity.userId,
    userEmail: entity.userEmail,
    userName: entity.userName,

    date: entity.date,
    location: entity.location,
    diveSite: entity.diveSite,
    diveNumber: entity.diveNumber,

    buddy: entity.buddy,
    shop: entity.shop,

    startTime: entity.startTime,
    endTime: entity.endTime,
    surfaceInterval: entity.surfaceInterval,

    maxDepth: entity.maxDepth,
    avgDepth: entity.avgDepth,
    bottomTime: entity.bottomTime,
    waterTemp: entity.waterTemp,
    visibility: entity.visibility,
    current: entity.current,
    wave: entity.wave,
    weather: entity.weather,
    entryType: entity.entryType,

    startPressure: entity.startPressure,
    endPressure: entity.endPressure,
    tankType: entity.tankType,
    tankSize: entity.tankSize,
    gasType: entity.gasType,

    residualNitrogen: entity.residualNitrogen,
    planFollowed: entity.planFollowed,

    equipmentChecklist: entity.equipmentChecklist,
    planChecklist: entity.planChecklist,

    memo: entity.memo,
    photoUrl: entity.photoUrl,

    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

app.get("/api/me", (req, res) => {
  const user = getUser(req);

  res.json({
    authenticated: !!user,
    user,
  });
});

app.get("/api/logs", async (req, res) => {
  try {
    const user = getUser(req);

    if (!user || !user.userId) {
      return res.json({
        logs: [],
        viewer: true,
        authenticated: false,
      });
    }

    const client = createTableClient();
    await client.createTable();

    const partitionKey = getUserPartitionKey(user);
    const logs = [];

    for await (const entity of client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${partitionKey}'`,
      },
    })) {
      logs.push(mapEntity(entity));
    }

    logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      logs,
      viewer: false,
      authenticated: true,
      user: {
        userId: user.userId,
        userEmail: user.userEmail,
        userName: user.userName,
      },
    });
  } catch (error) {
    console.error("GET /api/logs failed:", error);
    res.status(500).json({
      message: "Failed to load logs",
      error: error.message,
    });
  }
});

app.post("/api/logs", upload.single("photo"), async (req, res) => {
  try {
    const user = requireLogin(req, res);
    if (!user) return;

    const tableClient = createTableClient();
    await tableClient.createTable();

    const photoUrl = await uploadPhotoIfExists(req.file);
    const rowKey = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const entity = buildEntity(req.body, rowKey, photoUrl, createdAt, user);

    await tableClient.createEntity(entity);

    res.status(201).json({
      message: "Dive log saved",
      rowKey,
    });
  } catch (error) {
    console.error("POST /api/logs failed:", error);
    res.status(500).json({
      message: "Failed to save log",
      error: error.message,
    });
  }
});

app.put("/api/logs/:rowKey", upload.single("photo"), async (req, res) => {
  try {
    const user = requireLogin(req, res);
    if (!user) return;

    const tableClient = createTableClient();
    await tableClient.createTable();

    const partitionKey = getUserPartitionKey(user);
    const oldEntity = await tableClient.getEntity(partitionKey, req.params.rowKey);

    if (oldEntity.userId !== user.userId) {
      return res.status(403).json({
        message: "You can edit only your own logs",
      });
    }

    let photoUrl = oldEntity.photoUrl || "";

    if (req.file) {
      photoUrl = await uploadPhotoIfExists(req.file);
    } else if (req.body.keepExistingPhoto !== "true") {
      photoUrl = "";
    }

    const entity = buildEntity(
      req.body,
      req.params.rowKey,
      photoUrl,
      oldEntity.createdAt || new Date().toISOString(),
      user
    );

    await tableClient.updateEntity(entity, "Replace");

    res.json({
      message: "Dive log updated",
      rowKey: req.params.rowKey,
    });
  } catch (error) {
    console.error("PUT /api/logs failed:", error);
    res.status(500).json({
      message: "Failed to update log",
      error: error.message,
    });
  }
});

app.delete("/api/logs/:rowKey", async (req, res) => {
  try {
    const user = requireLogin(req, res);
    if (!user) return;

    const tableClient = createTableClient();
    await tableClient.createTable();

    const partitionKey = getUserPartitionKey(user);
    const oldEntity = await tableClient.getEntity(partitionKey, req.params.rowKey);

    if (oldEntity.userId !== user.userId) {
      return res.status(403).json({
        message: "You can delete only your own logs",
      });
    }

    await tableClient.deleteEntity(partitionKey, req.params.rowKey);

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