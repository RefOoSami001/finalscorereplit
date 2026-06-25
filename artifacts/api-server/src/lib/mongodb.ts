import { MongoClient, type Db } from "mongodb";
import { logger } from "./logger";

const MONGO_URI = process.env.MONGO_URI ?? "";
const DB_NAME = "finalscore";

if (!MONGO_URI) {
  logger.warn("MONGO_URI env var is not set — student records will NOT be saved to MongoDB");
}

let client: MongoClient | null = null;
let db: Db | null = null;

async function getDb(): Promise<Db | null> {
  if (!MONGO_URI) return null;
  if (db) return db;
  try {
    client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 8_000 });
    await client.connect();
    db = client.db(DB_NAME);
    await db.collection("students").createIndex({ national_id: 1 }, { unique: true });
    logger.info("MongoDB connected");
    return db;
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    client = null;
    db = null;
    return null;
  }
}

export interface StudentRecord {
  national_id: string;
  password: string;
  name: string;
  gender: string | null;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  email: string | null;
  father_phone: string | null;
  nationality: string | null;
  current_study_year: string | null;
  faculty: string | null;
  department: string | null;
  updated_at: Date;
}

export async function upsertStudent(record: StudentRecord): Promise<void> {
  try {
    const database = await getDb();
    if (!database) return;
    await database.collection<StudentRecord>("students").updateOne(
      { national_id: record.national_id },
      { $set: record },
      { upsert: true },
    );
    logger.info({ national_id: record.national_id }, "student upserted to MongoDB");
  } catch (err) {
    logger.error({ err }, "MongoDB upsert failed");
  }
}
