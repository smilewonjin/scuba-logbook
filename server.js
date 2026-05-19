import express from "express";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";
import { TableClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";

const app = express();
const PORT = process.env.PORT || 8080;

const LOG_TABLE = "divelogs";
const USER_TABLE = "users";
const BLOB_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || "divephotos";
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

const upload = multer({ storage: multer.memoryStorage() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

function tableClient(tableName) {
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }
  return TableClient.fromConnectionString(connectionString, tableName);
}

function blobContainerClient() {
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }
  return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(
    BLOB_CONTAINER_NAME
  );
}

function getUser(req) {
  const header = req.headers["x-ms-client-principal"];
  if (!header) return null;

  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    const claims = principal.claims || [];

    const emailClaim =
      claims.find((c) => c.typ === "emails") ||
      claims.find((c) => c.typ === "email") ||
      claims.find((c) => c.typ?.endsWith("/emailaddress"));

    const nameClaim =
      claims.find((c) => c.typ === "name") ||
      claims.find((c) => c.typ?.endsWith("/name"));

    const userEmail = emailClaim?.val || principal.userDetails || "";
    const userId = principal.userId || userEmail;

    return {
      userId,
      userEmail,
      userName: nameClaim?.val || userEmail,
      identityProvider: principal.identityProvider || "",
    };
  } catch {
    return null;
  }
}

function requireLogin(req, res) {
  const user = getUser(req);
  if (!user || !user.userId) {
    res.status(401).json({ message: "Login required" });
    return null;
  }
  return user;
}

function sanitize(value) {
  return String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function userPartition(userId) {
  return `DiveLog_${String(userId).replace(/[\\/#?]/g, "_").slice(0, 200)}`;
}

function makeSlug(user) {
  const base =
    user.userEmail?.split("@")[0] ||
    user.userName ||
    user.userId ||
    crypto.randomUUID();

  return sanitize(base);
}

async function ensureUserProfile(user) {
  const client = tableClient(USER_TABLE);
  await client.createTable();

  const partitionKey = "User";
  const rowKey = String(user.userId);

  try {
    const existing = await client.getEntity(partitionKey, rowKey);
    return existing;
  } catch {
    const now = new Date().toISOString();
    const profile = {
      partitionKey,
      rowKey,
      userId: user.userId,
      userEmail: user.userEmail,
      displayName: user.userName || user.userEmail,
      slug: makeSlug(user),
      bio: "",
      isPublicProfile: "true",
      createdAt: now,
      updatedAt: now,
    };

    await client.createEntity(profile);
    return profile;
  }
}

async function findUserBySlug(slug) {
  const client = tableClient(USER_TABLE);
  await client.createTable();

  for await (const user of client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq 'User'`,
    },
  })) {
    if (user.slug === slug) return user;
  }

  return null;
}

async function uploadPhoto(file) {
  if (!file) return "";

  const container = blobContainerClient();
  await container.createIfNotExists();

  const extension = path.extname(file.originalname) || ".jpg";
  const blobName = `${crypto.randomUUID()}${extension}`;
  const blob = container.getBlockBlobClient(blobName);

  await blob.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  });

  return blob.url;
}

function buildEntity(body, rowKey, photoUrl, createdAt, user, profile) {
  return {
    partitionKey: userPartition(user.userId),
    rowKey,

    userId: user.userId,
    userEmail: user.userEmail,
    userName: profile.displayName || user.userName || user.userEmail,
    userSlug: profile.slug,

    isPublic: body.isPublic === "true" ? "true" : "false",
    
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

function mapEntity(e) {
  return {
    partitionKey: e.partitionKey,
    rowKey: e.rowKey,

    userId: e.userId,
    userEmail: e.userEmail,
    userName: e.userName,
    userSlug: e.userSlug,

    isPublic: e.isPublic === "true",

    date: e.date,
    location: e.location,
    diveSite: e.diveSite,
    diveNumber: e.diveNumber,

    buddy: e.buddy,
    shop: e.shop,

    startTime: e.startTime,
    endTime: e.endTime,
    surfaceInterval: e.surfaceInterval,

    maxDepth: e.maxDepth,
    avgDepth: e.avgDepth,
    bottomTime: e.bottomTime,
    waterTemp: e.waterTemp,
    visibility: e.visibility,
    current: e.current,
    wave: e.wave,
    weather: e.weather,
    entryType: e.entryType,

    startPressure: e.startPressure,
    endPressure: e.endPressure,
    tankType: e.tankType,
    tankSize: e.tankSize,
    gasType: e.gasType,

    residualNitrogen: e.residualNitrogen,
    planFollowed: e.planFollowed,

    equipmentChecklist: e.equipmentChecklist,
    planChecklist: e.planChecklist,

    memo: e.memo,
    photoUrl: e.photoUrl,

    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

app.get("/api/me", async (req, res) => {
  const user = getUser(req);

  if (!user) {
    return res.json({ authenticated: false, user: null, profile: null });
  }

  const profile = await ensureUserProfile(user);

  res.json({
    authenticated: true,
    user,
    profile,
    myUrl: `/u/${profile.slug}`,
  });
});

app.get("/api/users", async (req, res) => {
  const client = tableClient(USER_TABLE);
  await client.createTable();

  const users = [];

  for await (const u of client.listEntities({
    queryOptions: { filter: `PartitionKey eq 'User'` },
  })) {
    if (u.isPublicProfile === "true") {
      users.push({
        displayName: u.displayName,
        slug: u.slug,
        bio: u.bio,
      });
    }
  }

  res.json({ users });
});

app.get("/api/feed", async (req, res) => {
  const client = tableClient(LOG_TABLE);
  await client.createTable();

  const logs = [];

  for await (const entity of client.listEntities()) {
    if (entity.isPublic === "true") {
      logs.push(mapEntity(entity));
    }
  }

  logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.json({ logs });
});

app.get("/api/users/:slug/logs", async (req, res) => {
  const profile = await findUserBySlug(req.params.slug);

  if (!profile) {
    return res.status(404).json({ message: "User not found" });
  }

  const viewer = getUser(req);
  const isOwner = viewer?.userId === profile.userId;

  const client = tableClient(LOG_TABLE);
  await client.createTable();

  const logs = [];

  for await (const entity of client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${userPartition(profile.userId)}'`,
    },
  })) {
    if (isOwner || entity.isPublic === "true") {
      logs.push(mapEntity(entity));
    }
  }

  logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.json({
    profile: {
      displayName: profile.displayName,
      slug: profile.slug,
      bio: profile.bio,
      isPublicProfile: profile.isPublicProfile,
    },
    isOwner,
    logs,
  });
});

app.get("/api/logs", async (req, res) => {
  const user = requireLogin(req, res);
  if (!user) return;

  const profile = await ensureUserProfile(user);

  const client = tableClient(LOG_TABLE);
  await client.createTable();

  const logs = [];

  for await (const entity of client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${userPartition(user.userId)}'`,
    },
  })) {
    logs.push(mapEntity(entity));
  }

  logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.json({ logs, profile, authenticated: true });
});

app.get("/api/water-temp", async (req, res) => {
  try {
    const apiKey = process.env.NIFS_API_KEY;

    const url =
      `https://www.nifs.go.kr/OpenAPI_json?id=risaList&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    const items = data?.body?.item || [];

    const normalized = items
      .filter((x) => x.repair_gbn === "1")
      .map((x) => ({
        station: x.sta_nam_kor,
        code: x.sta_cde,
        temperature: Number(x.wtr_tmp),
        layer:
          x.obs_lay === "1"
            ? "표층"
            : x.obs_lay === "2"
            ? "중층"
            : "저층",
        date: x.obs_dat,
        time: x.obs_tim,
      }));

    res.json(normalized);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load water temperature",
    });
  }
});

app.get("/api/water-stations", async (req, res) => {
  try {
    const apiKey = process.env.NIFS_API_KEY;

    const url =
      `https://www.nifs.go.kr/OpenAPI_json?id=risaCode&key=${apiKey}&use_yn=T`;

    const response = await fetch(url);
    const data = await response.json();

    const items = data?.body?.item || [];

    const normalized = items.map((x) => ({
      station: x.sta_nam_kor,
      code: x.sta_cde,
      area: x.gru_nam,
      lat: Number(x.lat),
      lon: Number(x.lon),
      description: x.sta_des,
    }));

    res.json(normalized);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load station info",
    });
  }
});

app.post("/api/logs", upload.single("photo"), async (req, res) => {
  try {
    const user = requireLogin(req, res);
    if (!user) return;

    const profile = await ensureUserProfile(user);
    const client = tableClient(LOG_TABLE);
    await client.createTable();

    const rowKey = crypto.randomUUID();
    const photoUrl = await uploadPhoto(req.file);
    const createdAt = new Date().toISOString();

    const entity = buildEntity(req.body, rowKey, photoUrl, createdAt, user, profile);

    await client.createEntity(entity);

    res.status(201).json({ message: "saved", rowKey });
  } catch (error) {
    console.error("POST /api/logs failed:", error);
    res.status(500).json({ message: "Failed to save log", error: error.message });
  }
});

app.put("/api/logs/:rowKey", upload.single("photo"), async (req, res) => {
  try {
    const user = requireLogin(req, res);
    if (!user) return;

    const profile = await ensureUserProfile(user);
    const client = tableClient(LOG_TABLE);
    await client.createTable();

    const partitionKey = userPartition(user.userId);
    const oldEntity = await client.getEntity(partitionKey, req.params.rowKey);

    if (oldEntity.userId !== user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let photoUrl = oldEntity.photoUrl || "";

    if (req.file) {
      photoUrl = await uploadPhoto(req.file);
    } else if (req.body.keepExistingPhoto !== "true") {
      photoUrl = "";
    }

    const entity = buildEntity(
      req.body,
      req.params.rowKey,
      photoUrl,
      oldEntity.createdAt,
      user,
      profile
    );

    await client.updateEntity(entity, "Replace");

    res.json({ message: "updated", rowKey: req.params.rowKey });
  } catch (error) {
    console.error("PUT /api/logs failed:", error);
    res.status(500).json({ message: "Failed to update log", error: error.message });
  }
});

app.delete("/api/logs/:rowKey", async (req, res) => {
  try {
    const user = requireLogin(req, res);
    if (!user) return;

    const client = tableClient(LOG_TABLE);
    await client.createTable();

    const partitionKey = userPartition(user.userId);
    const oldEntity = await client.getEntity(partitionKey, req.params.rowKey);

    if (oldEntity.userId !== user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await client.deleteEntity(partitionKey, req.params.rowKey);

    res.json({ message: "deleted" });
  } catch (error) {
    console.error("DELETE /api/logs failed:", error);
    res.status(500).json({ message: "Failed to delete log", error: error.message });
  }
});

app.get("/api/weather", async (req, res) => {
  try {
    const serviceKey = process.env.KMA_API_KEY;

    const nx = req.query.nx;
    const ny = req.query.ny;

    const now = new Date();

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const baseDate = `${yyyy}${mm}${dd}`;

    let hour = now.getHours();

    if (now.getMinutes() < 45) {
      hour -= 1;
    }

    if (hour < 0) {
      hour = 23;
    }

    const baseTime = `${String(hour).padStart(2, "0")}30`;

    const url = new URL(
      "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst"
    );

    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "1000");
    url.searchParams.set("dataType", "JSON");
    url.searchParams.set("base_date", baseDate);
    url.searchParams.set("base_time", baseTime);
    url.searchParams.set("nx", nx);
    url.searchParams.set("ny", ny);

    const response = await fetch(url);
    const text = await response.text();

    console.log(text);

    if (!text.startsWith("{")) {
      return res.status(500).json({
        message: text,
      });
    }

    const data = JSON.parse(text);

    const items =
      data?.response?.body?.items?.item || [];

    const result = {};

    for (const item of items) {
      result[item.category] = item.obsrValue;
    }

    const vec = Number(result.VEC || 0);

    const windDirection = (deg) => {
      if (deg >= 337.5 || deg < 22.5) return "북";
      if (deg < 67.5) return "북동";
      if (deg < 112.5) return "동";
      if (deg < 157.5) return "남동";
      if (deg < 202.5) return "남";
      if (deg < 247.5) return "남서";
      if (deg < 292.5) return "서";
      return "북서";
    };

    res.json({
      temperature: result.T1H,
      humidity: result.REH,
      windSpeed: result.WSD,
      windDirection: windDirection(vec),
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "weather load failed",
    });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});