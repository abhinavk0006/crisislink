import { resolve } from "node:path";
import { AppError } from "./auth";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
// Pin weights/tokenizer together. Changing this identity requires reindexing.
export const EMBEDDING_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
export const EMBEDDING_DIMENSIONS = 384;
export const EMBEDDING_ID = `${EMBEDDING_MODEL}@${EMBEDDING_REVISION}:mean:normalized:q8`;

type Extractor = (text: string, options: { pooling: "mean"; normalize: boolean }) =>
  Promise<{ data: ArrayLike<number> }>;
const state = globalThis as unknown as { crisisEmbedder?: Promise<Extractor> };

export async function embedText(text: string): Promise<number[]> {
  if (!state.crisisEmbedder) {
    state.crisisEmbedder = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = resolve(process.env.EMBEDDING_CACHE_DIR || "data/models");
      env.allowRemoteModels = process.env.EMBEDDING_OFFLINE !== "1";
      return await pipeline("feature-extraction", EMBEDDING_MODEL, {
        dtype: "q8", revision: EMBEDDING_REVISION,
      }) as unknown as Extractor;
    })().catch((e) => { state.crisisEmbedder = undefined; throw e; });
  }
  try {
    const extractor = await state.crisisEmbedder;
    const output = await extractor(text, { pooling: "mean", normalize: true });
    const values = Array.from(output.data);
    if (values.length !== EMBEDDING_DIMENSIONS || values.some((v) => !Number.isFinite(v)))
      throw Error("Invalid embedding output");
    return values;
  } catch {
    throw new AppError(503,
      "Semantic search model is unavailable. Run pnpm vector:setup to download/cache the model. Incident reporting and dispatch remain available.");
  }
}

export function vectorLiteral(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSIONS || values.some((v) => !Number.isFinite(v)))
    throw new AppError(400, "Expected a finite 384-dimensional vector");
  return "[" + values.join(",") + "]";
}
