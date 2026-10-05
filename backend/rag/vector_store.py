import math
import re
from collections import Counter
from typing import List, Dict, Any, Optional

class FastSemanticStore:
    """
    Ultra-fast in-memory lexical-semantic hybrid store.
    Instant initialization with zero remote network download delay.
    """
    def __init__(self):
        self.kb_documents: List[Dict[str, Any]] = []
        self.case_documents: List[Dict[str, Any]] = []

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b\w+\b', (text or "").lower())

    def _compute_bm25_score(self, query_tokens: List[str], doc_tokens: List[str], avg_len: float, doc_freqs: Dict[str, int], total_docs: int) -> float:
        k1 = 1.5
        b = 0.75
        score = 0.0
        doc_len = len(doc_tokens)
        doc_counts = Counter(doc_tokens)

        for token in query_tokens:
            if token in doc_counts:
                tf = doc_counts[token]
                df = doc_freqs.get(token, 1)
                idf = math.log((total_docs - df + 0.5) / (df + 0.5) + 1.0)
                numerator = tf * (k1 + 1)
                denominator = tf + k1 * (1 - b + b * (doc_len / (avg_len or 1.0)))
                score += idf * (numerator / (denominator or 1.0))
        return score

    def add_kb_articles(self, articles: List[Dict[str, Any]]):
        self.kb_documents.extend(articles)

    def add_historical_cases(self, cases: List[Dict[str, Any]]):
        self.case_documents.extend(cases)

    def search_kb(self, query: str, top_k: int = 3, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.kb_documents:
            return []

        docs = self.kb_documents
        if category:
            matched_cat = [d for d in docs if d.get("category", "").upper() == category.upper()]
            if matched_cat:
                docs = matched_cat

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return docs[:top_k]

        all_doc_tokens = [self._tokenize(f"{d.get('title', '')} {d.get('category', '')} {d.get('content', '')} {d.get('policy_tags', '')}") for d in docs]
        total_docs = len(docs)
        avg_len = sum(len(dt) for dt in all_doc_tokens) / (total_docs or 1)

        doc_freqs = Counter()
        for dt in all_doc_tokens:
            for token in set(dt):
                doc_freqs[token] += 1

        scored = []
        for i, doc in enumerate(docs):
            bm25 = self._compute_bm25_score(query_tokens, all_doc_tokens[i], avg_len, doc_freqs, total_docs)
            title_tokens = self._tokenize(doc.get("title", ""))
            bonus = sum(2.0 for q in query_tokens if q in title_tokens)
            scored.append((bm25 + bonus, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def search_cases(self, query: str, top_k: int = 3, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.case_documents:
            return []

        docs = self.case_documents
        if category:
            matched_cat = [d for d in docs if d.get("category", "").upper() == category.upper()]
            if matched_cat:
                docs = matched_cat

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return docs[:top_k]

        all_doc_tokens = [self._tokenize(f"{d.get('customer_query', '')} {d.get('category', '')} {d.get('intent', '')} {d.get('investigation_summary', '')} {d.get('resolution_action', '')}") for d in docs]
        total_docs = len(docs)
        avg_len = sum(len(dt) for dt in all_doc_tokens) / (total_docs or 1)

        doc_freqs = Counter()
        for dt in all_doc_tokens:
            for token in set(dt):
                doc_freqs[token] += 1

        scored = []
        for i, doc in enumerate(docs):
            bm25 = self._compute_bm25_score(query_tokens, all_doc_tokens[i], avg_len, doc_freqs, total_docs)
            scored.append((bm25, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

# Global singleton
vector_store = FastSemanticStore()
