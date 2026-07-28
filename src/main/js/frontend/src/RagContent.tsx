import 'bootstrap/dist/css/bootstrap.min.css';
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

type LanguageStatus = {
    start: string | null;
    end: string | null;
    isRunning: boolean;
    isLoaded: boolean;
};

type RunningState = {
    arabic: LanguageStatus;
    "english-kbp": LanguageStatus;
    english: LanguageStatus;
    chinese: LanguageStatus;
    french: LanguageStatus;
    german: LanguageStatus;
    spanish: LanguageStatus;
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

const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'en', label: 'English' },
    { value: 'english-kbp', label: 'English KBP' },
    { value: 'ar', label: 'Arabic' },
    { value: 'zh', label: 'Chinese' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'es', label: 'Spanish' }
];

const EMPTY_STATUS: LanguageStatus = { start: null, end: null, isRunning: false, isLoaded: false };

const INITIAL_RUNNING: RunningState = {
    arabic: { ...EMPTY_STATUS },
    "english-kbp": { ...EMPTY_STATUS },
    english: { ...EMPTY_STATUS },
    chinese: { ...EMPTY_STATUS },
    french: { ...EMPTY_STATUS },
    german: { ...EMPTY_STATUS },
    spanish: { ...EMPTY_STATUS }
};

const RAG_SAMPLES: RagSample[] = [
    {
        label: "[EN] Sample 1: Product launch",
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
        label: "[AR] Sample 2: Arabic health report",
        docId: "sample-arabic-health-report",
        sourceUri: "file://sample-arabic-health-report",
        ingestLanguage: "ar",
        chunkSize: 100,
        overlap: 15,
        ingestText: "Ajra al fariq al tibbi fi Mustashfa Al Salam fi Amman muraqaba li halat marid yadum alma min mudat usbua.",
        query: "Ayna ajra al fariq altibbi almuraqaba?",
        searchLanguage: "ar",
        topK: 4
    },
    {
        label: "[ZH] Sample 3: Chinese logistics",
        docId: "sample-chinese-logistics",
        sourceUri: "file://sample-chinese-logistics",
        ingestLanguage: "zh",
        chunkSize: 95,
        overlap: 15,
        ingestText: "Shenzhen de Haiyun Wuliu gongsi zai Guangzhou qidong xin peisong zhongxin bing yu Nanfang Daxue hezuo ceshi jiansuo liucheng.",
        query: "Nage chengshi qidong le xin peisong zhongxin?",
        searchLanguage: "zh",
        topK: 4
    },
    {
        label: "[EN-KBP] Sample 4: English KBP incident",
        docId: "sample-english-kbp-incident",
        sourceUri: "file://sample-english-kbp-incident",
        ingestLanguage: "english-kbp",
        chunkSize: 110,
        overlap: 20,
        ingestText: "Authorities reported that Vega Systems coordinated with Interpol in Madrid to investigate a network tied to forged travel records.",
        query: "Which organization coordinated with Interpol and in what city?",
        searchLanguage: "english-kbp",
        topK: 5
    },
    {
        label: "[FR] Sample 5: French transport",
        docId: "sample-french-transport",
        sourceUri: "file://sample-french-transport",
        ingestLanguage: "fr",
        chunkSize: 110,
        overlap: 20,
        ingestText: "La mairie de Lyon a annonce un partenariat avec TransMobilite pour moderniser les lignes de bus avant les Jeux regionaux.",
        query: "Quelle ville a annonce le partenariat avec TransMobilite?",
        searchLanguage: "fr",
        topK: 5
    },
    {
        label: "[DE] Sample 6: German manufacturing",
        docId: "sample-german-manufacturing",
        sourceUri: "file://sample-german-manufacturing",
        ingestLanguage: "de",
        chunkSize: 100,
        overlap: 10,
        ingestText: "Das Werk in Stuttgart arbeitet seit 2026 mit der Firma NordTech zusammen, um ein System fur industrielle Wissenssuche einzufuhren.",
        query: "Mit welcher Firma arbeitet das Werk in Stuttgart zusammen?",
        searchLanguage: "de",
        topK: 3
    },
    {
        label: "[ES] Sample 7: Spanish tourism",
        docId: "sample-spanish-tourism",
        sourceUri: "file://sample-spanish-tourism",
        ingestLanguage: "es",
        chunkSize: 100,
        overlap: 10,
        ingestText: "La Oficina de Turismo de Sevilla colaboro con Viajes Sur para lanzar una guia digital enfocada en visitantes de America Latina.",
        query: "Que ciudad colaboro con Viajes Sur?",
        searchLanguage: "es",
        topK: 3
    }
];

function RagContent() {
    const [running, setRunning] = useState<RunningState>(INITIAL_RUNNING);
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

    const isLanguageLoaded = useCallback((lang: string): boolean => {
        switch (lang) {
            case 'en':
                return running.english.isLoaded;
            case 'english-kbp':
                return running['english-kbp'].isLoaded;
            case 'ar':
                return running.arabic.isLoaded;
            case 'zh':
                return running.chinese.isLoaded;
            case 'fr':
                return running.french.isLoaded;
            case 'de':
                return running.german.isLoaded;
            case 'es':
                return running.spanish.isLoaded;
            default:
                return false;
        }
    }, [running]);

    const ingestLanguageLoaded = isLanguageLoaded(ingestLanguage);
    const searchLanguageLoaded = isLanguageLoaded(searchLanguage);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/exist/restxq/stanford/nlp/logs', { signal: controller.signal })
            .then((response) => response.json())
            .then((result: { running: RunningState }) => {
                setRunning(result.running);
            })
            .catch(() => {
                // Keep defaults if status endpoint is temporarily unavailable.
            });
        return () => controller.abort();
    }, []);

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

        if (!isLanguageLoaded(ingestLanguage)) {
            setErrorMessage(`Language '${ingestLanguage}' is not loaded. Load it from Setup before ingest.`);
            return;
        }

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

        if (!isLanguageLoaded(searchLanguage)) {
            setErrorMessage(`Language '${searchLanguage}' is not loaded. Load it from Setup before search.`);
            return;
        }

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
                        <Form.Select value={ingestLanguage} onChange={(e) => setIngestLanguage(e.target.value)}>
                            {LANGUAGE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} disabled={!isLanguageLoaded(option.value)}>{option.label}</option>
                            ))}
                        </Form.Select>
                    </Col>
                </Row>
                {!ingestLanguageLoaded ? (
                    <div style={{ marginBottom: 12, color: '#b00020' }}>
                        Ingest language is not loaded. Use Setup to load it first.
                    </div>
                ) : null}
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
                        <Form.Select value={searchLanguage} onChange={(e) => setSearchLanguage(e.target.value)}>
                            {LANGUAGE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} disabled={!isLanguageLoaded(option.value)}>{option.label}</option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col md={2}>
                        <Form.Label>Top K</Form.Label>
                        <Form.Control type="number" value={topK} onChange={(e) => setTopK(Number(e.target.value))} />
                    </Col>
                </Row>
                {!searchLanguageLoaded ? (
                    <div style={{ marginBottom: 12, color: '#b00020' }}>
                        Search language is not loaded. Use Setup to load it first.
                    </div>
                ) : null}
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

