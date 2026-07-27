import 'bootstrap/dist/css/bootstrap.min.css';
import React, { FormEvent, useMemo, useState } from "react";
import './App.css';
import { Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";

type IngestResponse = {
    status: boolean;
    error?: string;
    docId?: string;
    language?: string;
    chunksIngested?: number;
    chunkIds?: string[];
};

type SearchResult = {
    chunkId: string;
    docId: string;
    sourceUri: string;
    language: string;
    text: string;
    entities: string[];
    score: number;
};

type SearchResponse = {
    status: boolean;
    error?: string;
    query?: string;
    language?: string;
    queryEntities?: string[];
    results: SearchResult[];
};

type RagSample = {
    label: string;
    docId: string;
    sourceUri: string;
    ingestLanguage: string;
    chunkSize: number;
    overlap: number;
    ingestText: string;
    query: string;
    searchLanguage: string;
    topK: number;
};

const RAG_SAMPLES: RagSample[] = [
    {
        label: "Sample 1: Product launch",
        docId: "sample-product-launch",
        sourceUri: "file://sample-product-launch",
        ingestLanguage: "en",
        chunkSize: 120,
        overlap: 20,
        ingestText: "Acme Robotics launched Atlas Assist in Austin. The release notes describe retrieval augmented generation for support workflows and cite improvements in entity aware ranking.",
        query: "What was launched in Austin and for what workflow?",
        searchLanguage: "en",
        topK: 5
    },
    {
        label: "Sample 2: Clinical notes",
        docId: "sample-clinical-notes",
        sourceUri: "file://sample-clinical-notes",
        ingestLanguage: "en",
        chunkSize: 90,
        overlap: 15,
        ingestText: "Dr. Elena Ruiz reviewed patient records at St. Mary Hospital in Denver. She noted that retrieval systems should keep references to people, locations, and dates for safer answers.",
        query: "Which hospital and city were mentioned?",
        searchLanguage: "en",
        topK: 4
    },
    {
        label: "Sample 3: Finance summary",
        docId: "sample-finance-summary",
        sourceUri: "file://sample-finance-summary",
        ingestLanguage: "en",
        chunkSize: 110,
        overlap: 20,
        ingestText: "In Q3, Orion Bank partnered with Nova Analytics in London to pilot a retrieval pipeline for anti fraud analysts. The team compared baseline semantic search with entity boosted retrieval.",
        query: "Who partnered in London and what did they pilot?",
        searchLanguage: "en",
        topK: 5
    },
    {
        label: "Sample 4: Research digest",
        docId: "sample-research-digest",
        sourceUri: "file://sample-research-digest",
        ingestLanguage: "en",
        chunkSize: 100,
        overlap: 10,
        ingestText: "A team from the University of Zurich and ETH Zurich published a report on multilingual retrieval in 2026. Their experiments favored chunk overlap and named entity cues for higher precision.",
        query: "Which institutions published the 2026 report?",
        searchLanguage: "en",
        topK: 3
    }
];

function RagContent() {
    const [docId, setDocId] = useState('sample-doc-1');
    const [sourceUri, setSourceUri] = useState('file://sample-doc-1');
    const [ingestLanguage, setIngestLanguage] = useState('en');
    const [chunkSize, setChunkSize] = useState(120);
    const [overlap, setOverlap] = useState(20);
    const [ingestText, setIngestText] = useState('Stanford NLP can enrich chunks for retrieval augmented generation workflows.');

    const [query, setQuery] = useState('retrieval generation workflows');
    const [searchLanguage, setSearchLanguage] = useState('en');
    const [topK, setTopK] = useState(5);

    const [ingestLoading, setIngestLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [clearLoading, setClearLoading] = useState(false);

    const [ingestResponse, setIngestResponse] = useState<IngestResponse | null>(null);
    const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
    const [clearMessage, setClearMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const queryEntities = useMemo(() => searchResponse?.queryEntities ?? [], [searchResponse]);

    function applySample(sample: RagSample) {
        setDocId(sample.docId);
        setSourceUri(sample.sourceUri);
        setIngestLanguage(sample.ingestLanguage);
        setChunkSize(sample.chunkSize);
        setOverlap(sample.overlap);
        setIngestText(sample.ingestText);
        setQuery(sample.query);
        setSearchLanguage(sample.searchLanguage);
        setTopK(sample.topK);
        setErrorMessage('');
        setClearMessage('');
    }

    async function handleIngest(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErrorMessage('');
        setClearMessage('');
        setIngestLoading(true);

        try {
            const response = await fetch('/exist/restxq/stanford/rag/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docId,
                    sourceUri,
                    language: ingestLanguage,
                    chunkSize,
                    overlap,
                    text: ingestText
                })
            });

            const payload = await response.json() as IngestResponse;
            setIngestResponse(payload);

            if (!payload.status) {
                setErrorMessage(payload.error ?? 'RAG ingest failed.');
            }
        } catch (_error) {
            setErrorMessage('Unable to reach the RAG ingest endpoint.');
        } finally {
            setIngestLoading(false);
        }
    }

    async function handleSearch(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErrorMessage('');
        setClearMessage('');
        setSearchLoading(true);

        try {
            const params = new URLSearchParams({
                q: query,
                lang: searchLanguage,
                topK: String(topK)
            });
            const response = await fetch(`/exist/restxq/stanford/rag/search?${params.toString()}`);
            const payload = await response.json() as SearchResponse;
            setSearchResponse(payload);

            if (!payload.status) {
                setErrorMessage(payload.error ?? 'RAG search failed.');
            }
        } catch (_error) {
            setErrorMessage('Unable to reach the RAG search endpoint.');
        } finally {
            setSearchLoading(false);
        }
    }

    async function handleClear() {
        setErrorMessage('');
        setClearLoading(true);

        try {
            const response = await fetch('/exist/restxq/stanford/rag/clear');
            const payload = await response.json() as { status?: boolean; removed?: number };
            if (payload.status) {
                setSearchResponse(null);
                setIngestResponse(null);
                setClearMessage(`Cleared ${payload.removed ?? 0} indexed chunks.`);
            } else {
                setErrorMessage('RAG clear failed.');
            }
        } catch (_error) {
            setErrorMessage('Unable to reach the RAG clear endpoint.');
        } finally {
            setClearLoading(false);
        }
    }

    return (
        <div className={'NLPContent'} style={{ padding: 35, overflowY: 'auto' }}>
            <h1>RAG</h1>
            <p>Ingest text chunks with NER enrichment and search ranked results.</p>

            <h3>Examples</h3>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16}}>
                {RAG_SAMPLES.map((sample) => (
                    <Button
                        key={sample.label}
                        type="button"
                        variant="outline-secondary"
                        onClick={() => applySample(sample)}
                    >
                        {sample.label}
                    </Button>
                ))}
            </div>

            {errorMessage ? <div style={{ color: '#b00020', marginBottom: 12 }}>{errorMessage}</div> : null}
            {clearMessage ? <div style={{ color: '#0a7a0a', marginBottom: 12 }}>{clearMessage}</div> : null}

            <h3>Ingest</h3>
            <Form onSubmit={handleIngest}>
                <Row className={'mb-3'}>
                    <Col md={4}>
                        <Form.Label>Doc ID</Form.Label>
                        <Form.Control value={docId} onChange={(e) => setDocId(e.target.value)} />
                    </Col>
                    <Col md={4}>
                        <Form.Label>Source URI</Form.Label>
                        <Form.Control value={sourceUri} onChange={(e) => setSourceUri(e.target.value)} />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Language</Form.Label>
                        <Form.Control value={ingestLanguage} onChange={(e) => setIngestLanguage(e.target.value)} />
                    </Col>
                </Row>
                <Row className={'mb-3'}>
                    <Col md={2}>
                        <Form.Label>Chunk Size</Form.Label>
                        <Form.Control type="number" value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Overlap</Form.Label>
                        <Form.Control type="number" value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} />
                    </Col>
                </Row>
                <Form.Group className={'mb-3'}>
                    <Form.Label>Text</Form.Label>
                    <Form.Control as="textarea" rows={6} value={ingestText} onChange={(e) => setIngestText(e.target.value)} />
                </Form.Group>
                <Button type="submit" disabled={ingestLoading}>
                    {ingestLoading ? <Spinner as="span" size="sm" animation="border" /> : null} Ingest Chunks
                </Button>
            </Form>

            {ingestResponse?.status ? (
                <div style={{ marginTop: 12 }}>
                    <b>Ingested:</b> {ingestResponse.chunksIngested ?? 0} chunk(s) for <code>{ingestResponse.docId}</code>
                </div>
            ) : null}

            <hr />

            <h3>Search</h3>
            <Form onSubmit={handleSearch}>
                <Row className={'mb-3'}>
                    <Col md={7}>
                        <Form.Label>Query</Form.Label>
                        <Form.Control value={query} onChange={(e) => setQuery(e.target.value)} />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Language</Form.Label>
                        <Form.Control value={searchLanguage} onChange={(e) => setSearchLanguage(e.target.value)} />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Top K</Form.Label>
                        <Form.Control type="number" value={topK} onChange={(e) => setTopK(Number(e.target.value))} />
                    </Col>
                </Row>
                <Button type="submit" disabled={searchLoading}>
                    {searchLoading ? <Spinner as="span" size="sm" animation="border" /> : null} Search Chunks
                </Button>
                <Button
                    type="button"
                    variant="outline-danger"
                    style={{ marginLeft: 10 }}
                    onClick={handleClear}
                    disabled={clearLoading}
                >
                    {clearLoading ? <Spinner as="span" size="sm" animation="border" /> : null} Clear Index
                </Button>
            </Form>

            {queryEntities.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                    <b>Query entities:</b> {queryEntities.join(', ')}
                </div>
            ) : null}

            <Table striped bordered hover size="sm" style={{ marginTop: 16 }}>
                <thead>
                <tr>
                    <th>Score</th>
                    <th>Chunk</th>
                    <th>Doc</th>
                    <th>Entities</th>
                    <th>Text</th>
                </tr>
                </thead>
                <tbody>
                {(searchResponse?.results ?? []).map((result) => (
                    <tr key={result.chunkId}>
                        <td>{result.score}</td>
                        <td>{result.chunkId}</td>
                        <td>{result.docId}</td>
                        <td>{(result.entities ?? []).join(', ')}</td>
                        <td>{result.text}</td>
                    </tr>
                ))}
                </tbody>
            </Table>
        </div>
    );
}

export default RagContent;

