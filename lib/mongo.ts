import { MongoClient, ObjectId, type Document } from "mongodb";
import { z } from "zod";
import { type Actor } from "./db";
import { AppError } from "./auth";
import { ensureIncident } from "./service";
export const noteValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "emergency_id",
      "author_id",
      "author_name",
      "text",
      "tags",
      "assessment",
      "created_at",
      "updated_at",
    ],
    properties: {
      emergency_id: { bsonType: "int", minimum: 1 },
      author_id: { bsonType: "int", minimum: 1 },
      author_name: { bsonType: "string" },
      text: { bsonType: "string", minLength: 5, maxLength: 2000 },
      tags: { bsonType: "array", maxItems: 8, items: { bsonType: "string" } },
      assessment: { bsonType: "object" },
      created_at: { bsonType: "date" },
      updated_at: { bsonType: "date" },
    },
  },
};
type Note = Document & {
  emergency_id: number;
  author_id: number;
  author_name: string;
  text: string;
  tags: string[];
  assessment: Record<string, string>;
  created_at: Date;
  updated_at: Date;
};
const state = globalThis as unknown as { crisisMongo?: Promise<MongoClient> };
export async function mongo() {
  if (!state.crisisMongo)
    state.crisisMongo = (async () => {
      const client = new MongoClient(
        process.env.MONGODB_URI || "mongodb://127.0.0.1:27028",
        { serverSelectionTimeoutMS: 2500 },
      );
      await client.connect();
      const db = client.db(process.env.MONGODB_DATABASE || "crisislink");
      try {
        await db.createCollection("field_notes", {
          validator: noteValidator,
          validationAction: "error",
        });
      } catch (e) {
        if ((e as { code?: number }).code !== 48) throw e;
      }
      await db
        .collection("field_notes")
        .createIndex({ emergency_id: 1, created_at: -1 });
      await db
        .collection("field_notes")
        .createIndex({ text: "text", tags: "text" });
      await db.collection("field_notes").createIndex({ report_review_id: 1 }, {
        unique: true, partialFilterExpression: { report_review_id: { $type: "string" } },
      });
      return client;
    })().catch((e) => {
      state.crisisMongo = undefined;
      throw e;
    });
  try {
    const client = await state.crisisMongo;
    return client
      .db(process.env.MONGODB_DATABASE || "crisislink")
      .collection<Note>("field_notes");
  } catch {
    throw new AppError(
      503,
      "MongoDB is unavailable. The note was not saved; retry when the database is running.",
    );
  }
}
const noteInput = z.object({
  emergency_id: z.number().int().positive(),
  text: z.string().trim().min(5).max(2000),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  assessment: z
    .record(z.string().max(40), z.string().max(200))
    .refine((v) => Object.keys(v).length <= 10)
    .default({}),
});
export async function listNotes(actor: Actor, incident: number, search = "") {
  await ensureIncident(actor, incident);
  const col = await mongo();
  const filter: Document = { emergency_id: incident };
  if (search.trim()) filter.$text = { $search: search.slice(0, 100) };
  const notes = await col
    .find(filter)
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
  const summary = await col
    .aggregate([
      { $match: { emergency_id: incident } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])
    .toArray();
  return { notes, summary };
}
export async function createNote(actor: Actor, input: unknown) {
  const d = noteInput.parse(input);
  await ensureIncident(actor, d.emergency_id, true);
  const col = await mongo();
  const now = new Date();
  const result = await col.insertOne({
    ...d,
    author_id: actor.user_id,
    author_name: actor.full_name,
    created_at: now,
    updated_at: now,
  });
  return { id: result.insertedId.toHexString() };
}
async function ownedNote(actor: Actor, id: string) {
  if (!ObjectId.isValid(id)) throw new AppError(400, "Invalid note ID");
  const col = await mongo();
  const note = await col.findOne({ _id: new ObjectId(id) });
  if (!note) throw new AppError(404, "Note not found");
  await ensureIncident(actor, note.emergency_id, true);
  if (actor.role_name !== "Coordinator" && note.author_id !== actor.user_id)
    throw new AppError(
      403,
      "Only the author or coordinator can change this note",
    );
  return { col, note };
}
export async function updateNote(actor: Actor, id: string, input: unknown) {
  const { col, note } = await ownedNote(actor, id);
  const d = noteInput.omit({ emergency_id: true }).parse(input);
  await col.updateOne(
    { _id: note._id },
    { $set: { ...d, updated_at: new Date() } },
  );
  return { updated: true };
}
export async function deleteNote(actor: Actor, id: string) {
  const { col, note } = await ownedNote(actor, id);
  await col.deleteOne({ _id: note._id });
  return { deleted: true };
}

// Called only after the coordinator's signed duplicate-review decision is checked.
export async function saveAdditionalReport(actor: Actor, incident: number, reviewId: string,
  draft: {description:string;type_id:number;location_id:number;severity_level:string;people_affected:number;capability_id?:number;reported_location_text?:string}) {
  const col = await mongo();
  const now = new Date();
  const document = {
    emergency_id: incident, author_id: actor.user_id, author_name: actor.full_name,
    text: draft.description, tags: ["additional-report"],
    assessment: { source: "Coordinator confirmed same incident", reported_type_id: String(draft.type_id),
      reported_location_id: String(draft.location_id), ...(draft.reported_location_text ? {reported_location_text:draft.reported_location_text} : {}), reported_severity: draft.severity_level,
      reported_people_affected: String(draft.people_affected),
      reported_capability_id: draft.capability_id ? String(draft.capability_id) : "Not specified" },
    created_at: now, updated_at: now, report_review_id: reviewId,
  };
  try { await col.updateOne({ report_review_id: reviewId }, { $setOnInsert: document }, { upsert: true }); }
  catch (e) { if ((e as {code?:number}).code !== 11000) throw e; }
  const saved = await col.findOne({ report_review_id: reviewId, author_id: actor.user_id, emergency_id: incident });
  if (!saved) throw new AppError(503, "Additional report was not confirmed saved. Retry the same decision.");
  return { id: saved._id.toHexString() };
}
