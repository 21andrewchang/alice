import os
import glob
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer

# paths
root_dir = os.path.dirname(os.path.abspath(__file__)) # alice/rec_alg
transcripts_dir = os.path.join(root_dir, 'transcripts')
out_dir = os.path.join(root_dir, "embeddings")
os.makedirs(out_dir, exist_ok=True)

# load model
model = SentenceTransformer('all-mpnet-base-v2')
tokenizer = model.tokenizer

# args
topics = ["cv", "nlp"]
max_tokens = tokenizer.model_max_length
overlap = 50

def chunk_text(text, max_tokens, overlap):
    all_ids = tokenizer.encode(text, add_special_tokens=False)
    chunks = []
    step = max_tokens - overlap

    for chunk_start in range(0, len(all_ids), step):
        chunk = all_ids[chunk_start:chunk_start + max_tokens]
        chunks.append(tokenizer.decode(chunk, clean_up_tokenization_spaces=True))
        if chunk_start + max_tokens >= len(all_ids):
            break

    return chunks

if __name__ == "__main__":
    vid_embeddings = {}
    for topic in topics:
        pattern = os.path.join(transcripts_dir, topic, f"{topic}*_*.txt")
        for path in tqdm(glob.glob(pattern)):
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()

            chunks = chunk_text(text, max_tokens, overlap)
            chunk_embed = model.encode(chunks, convert_to_numpy=True, show_progress_bar=False, truncate=True, max_length=max_tokens)
            vid_embed = np.mean(chunk_embed, axis=0)
            vid_key = os.path.splitext(os.path.basename(path))[0]
            vid_embed[vid_key] = vid_embed
            np.save(os.path.join(out_dir, f"{vid_key}.npy"), vid_embed)
        
print(f"Done! Generated embeddings for {len(vid_embeddings)} videos.")
