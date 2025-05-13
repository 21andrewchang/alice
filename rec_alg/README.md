# **Recommendation Algorithm**

## **Semantic Embeddings**

### What are semantic embeddings?
Semantic embeddings are fixed-length numeric vectors that capture the meaning of text in high-dimensional feature space. Once these embeddings are generated, we can then find the cosine similarity between these embeddings to see how similar or different two videos are.

### Why we use embeddings
- Videos covering similar concepts will have vectors that lie near each other, keeping recommendations on-topic.
- Allows for immediate recommendations without requiring user data since every brand-new video has its own embedding.
- Once embedded, vectors can be indexed with extremely quick nearest-neighbor lookups, regardless of library size.

### How it works.
- We first begin by extracting the transcripts from the videos. Since these transcripts are many tokens too long for a single embedding, we generate the embeddings in chunks of text.
- In order to preserver context between each chunk, we have a slight overlap during the embedding process.
- Then, we used a SentenceTransformer from Hugging Face (`all-mpnet-base-v2`) to embed the text chunks.
- These embeddings were then averaged to get a single embedding for the entire video.
- Once the embedding was generated for each video, we were able to determine their similarity score by calculating the cosine similarity between each pair of high-dimensional vectors.
