import 'bootstrap/dist/css/bootstrap.min.css';
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import './App.css';
import {Button, Col, Form, Row} from "react-bootstrap";
import { API_ENDPOINTS } from './apiConfig';

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

type NerError = {
    code: string | null;
    description: string | null;
    value: string | null;
    properties: Record<string, unknown>;
};

type NerRequestError = Error & Partial<NerError>;

type PosToken = {
    token: string;
    tag: string;
};

type PosCategory =
    | 'noun'
    | 'verb'
    | 'adjective'
    | 'adverb'
    | 'pronoun'
    | 'determiner'
    | 'adposition'
    | 'conjunction'
    | 'particle'
    | 'numeral'
    | 'punctuation'
    | 'other';

type NerResponse = {
    text?: string;
    pos?: PosToken[];
} & NerError;

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

const INITIAL_ERROR: NerError = { code: null, description: null, value: null, properties: {} };

function sanitizeNerMarkup(rawMarkup: string, enableTooltipFocus: boolean): string {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<div>${rawMarkup}</div>`, 'text/html');
    const sourceRoot = parsed.body.firstElementChild;
    const safeRoot = document.createElement('div');

    if (!sourceRoot) {
        return '';
    }

    const safeTooltipPositions = new Set(['top', 'right', 'bottom', 'left']);
    let tooltipIdCounter = 0;

    const copySafeNodes = (sourceNode: Node, targetNode: HTMLElement) => {
        sourceNode.childNodes.forEach((childNode) => {
            if (childNode.nodeType === Node.TEXT_NODE) {
                targetNode.appendChild(document.createTextNode(childNode.textContent ?? ''));
                return;
            }

            if (childNode.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            const childElement = childNode as HTMLElement;
            const tagName = childElement.tagName.toLowerCase();

            if (tagName === 'script' || tagName === 'style' || tagName === 'iframe' || tagName === 'object') {
                return;
            }

            if (tagName === 'span') {
                const safeSpan = document.createElement('span');
                const className = childElement.getAttribute('class');
                if (className && /^[A-Za-z0-9_\-\s]+$/.test(className)) {
                    safeSpan.setAttribute('class', className.trim());
                }

                const tooltip = childElement.getAttribute('data-tooltip');
                if (tooltip && /^[A-Za-z0-9_\-\s]+$/.test(tooltip)) {
                    const tooltipText = tooltip.trim();
                    safeSpan.setAttribute('data-tooltip', tooltipText);
                    if (enableTooltipFocus) {
                        safeSpan.setAttribute('tabindex', '0');
                    }
                    const tooltipId = `ner-tooltip-${tooltipIdCounter++}`;
                    safeSpan.setAttribute('aria-describedby', tooltipId);
                    const tooltipDescription = document.createElement('span');
                    tooltipDescription.setAttribute('id', tooltipId);
                    tooltipDescription.setAttribute('class', 'sr-only');
                    tooltipDescription.textContent = `${tooltipText} entity`;
                    targetNode.appendChild(tooltipDescription);
                }

                const tooltipPosition = childElement.getAttribute('data-tooltip-position');
                if (tooltipPosition && safeTooltipPositions.has(tooltipPosition)) {
                    safeSpan.setAttribute('data-tooltip-position', tooltipPosition);
                }

                copySafeNodes(childElement, safeSpan);
                targetNode.appendChild(safeSpan);
                return;
            }

            copySafeNodes(childElement, targetNode);
        });
    };

    copySafeNodes(sourceRoot, safeRoot);
    return safeRoot.innerHTML;
}

function toNerRequestError(details: Partial<NerError>): NerRequestError {
    const error = new Error(details.description ?? 'NER request failed') as NerRequestError;
    error.code = details.code;
    error.description = details.description;
    error.value = details.value;
    error.properties = details.properties;
    return error;
}

const NER_SAMPLES: Array<{ label: string; language: string; text: string }> = [
    {
        label: "[EN] Sample 1: English news",
        language: "en",
        text: "Apple announced in Cupertino that Tim Cook will visit Berlin next week to discuss AI partnerships with Siemens."
    },
    {
        label: "[AR] Sample 2: Arabic briefing",
        language: "ar",
        text: "زار المدير سامر شركة جوجل في دبي مع فريق مايكروسوفت لمناقشة مشروع جديد."
    },
    {
        label: "[ZH] Sample 3: Chinese technology",
        language: "zh",
        text: "苹果公司在北京宣布蒂姆库克将访问上海。"
    },
    {
        label: "[EN-KBP] Sample 4: English KBP incident",
        language: "english-kbp",
        text: "In 2026, investigators said Orion Security identified Malik Hassan near Cairo during a joint operation with Interpol."
    },
    {
        label: "[FR] Sample 5: French business",
        language: "fr",
        text: "Le ministre de l'Economie a rencontre des dirigeants d'Airbus a Toulouse pour parler des investissements en 2027."
    },
    {
        label: "[DE] Sample 6: German research",
        language: "de",
        text: "Forscher der Universitat Freiburg prasentierten in Munchen neue Ergebnisse zur Verarbeitung naturlicher Sprache."
    },
    {
        label: "[ES] Sample 7: Spanish travel",
        language: "es",
        text: "Mariana viajo de Madrid a Barcelona y luego a Valencia para una conferencia de tecnologia en la Universidad Politecnica."
    }
];

const POS_TAG_DETAILS: Record<string, { label: string; category: PosCategory }> = {
    CC: { label: 'Coordinating conjunction', category: 'conjunction' },
    CD: { label: 'Cardinal number', category: 'numeral' },
    DT: { label: 'Determiner', category: 'determiner' },
    EX: { label: 'Existential there', category: 'pronoun' },
    FW: { label: 'Foreign word', category: 'other' },
    IN: { label: 'Preposition/subordinating conjunction', category: 'adposition' },
    JJ: { label: 'Adjective', category: 'adjective' },
    JJR: { label: 'Adjective, comparative', category: 'adjective' },
    JJS: { label: 'Adjective, superlative', category: 'adjective' },
    LS: { label: 'List item marker', category: 'other' },
    MD: { label: 'Modal', category: 'verb' },
    NN: { label: 'Noun, singular or mass', category: 'noun' },
    NNS: { label: 'Noun, plural', category: 'noun' },
    NNP: { label: 'Proper noun, singular', category: 'noun' },
    NNPS: { label: 'Proper noun, plural', category: 'noun' },
    PDT: { label: 'Predeterminer', category: 'determiner' },
    POS: { label: 'Possessive ending', category: 'particle' },
    PRP: { label: 'Personal pronoun', category: 'pronoun' },
    'PRP$': { label: 'Possessive pronoun', category: 'pronoun' },
    RB: { label: 'Adverb', category: 'adverb' },
    RBR: { label: 'Adverb, comparative', category: 'adverb' },
    RBS: { label: 'Adverb, superlative', category: 'adverb' },
    RP: { label: 'Particle', category: 'particle' },
    SYM: { label: 'Symbol', category: 'other' },
    TO: { label: 'to', category: 'particle' },
    UH: { label: 'Interjection', category: 'other' },
    VB: { label: 'Verb, base form', category: 'verb' },
    VBD: { label: 'Verb, past tense', category: 'verb' },
    VBG: { label: 'Verb, gerund/present participle', category: 'verb' },
    VBN: { label: 'Verb, past participle', category: 'verb' },
    VBP: { label: 'Verb, non-3rd person singular present', category: 'verb' },
    VBZ: { label: 'Verb, 3rd person singular present', category: 'verb' },
    WDT: { label: 'Wh-determiner', category: 'determiner' },
    WP: { label: 'Wh-pronoun', category: 'pronoun' },
    'WP$': { label: 'Possessive wh-pronoun', category: 'pronoun' },
    WRB: { label: 'Wh-adverb', category: 'adverb' },
    '.': { label: 'Sentence-final punctuation', category: 'punctuation' },
    ',': { label: 'Comma', category: 'punctuation' },
    ':': { label: 'Colon or ellipsis', category: 'punctuation' },
    ';': { label: 'Semicolon', category: 'punctuation' },
    '``': { label: 'Opening quotation mark', category: 'punctuation' },
    "''": { label: 'Closing quotation mark', category: 'punctuation' },
    '-LRB-': { label: 'Left round bracket', category: 'punctuation' },
    '-RRB-': { label: 'Right round bracket', category: 'punctuation' }
};

function getPosTagDetails(tag: string): { label: string; category: PosCategory } {
    const normalized = tag.trim().toUpperCase();
    return POS_TAG_DETAILS[normalized] ?? { label: 'Unknown tag', category: 'other' };
}

function NERContext() {

    const [running, setRunning] = useState<RunningState>(INITIAL_RUNNING);

    const [language, setLanguage] = useState("en");
    const [content, setContent] = useState("");
    const [rawNamedEntities, setRawNamedEntities] = useState("");
    const [namedEntities, setNamedEntities] = useState("");
    const [partsOfSpeech, setPartsOfSpeech] = useState<PosToken[]>([]);
    const [nerError, setNerError] = useState<NerError>(INITIAL_ERROR);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [enableTooltipFocus, setEnableTooltipFocus] = useState(false);
    const [statusFetchError, setStatusFetchError] = useState<string | null>(null);

    const languageFieldErrorId = 'ner-language-error';
    const textFieldErrorId = 'ner-input-error';

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

    const languageLoaded = isLanguageLoaded(language);
    const showLanguageFieldError = hasAttemptedSubmit && (!languageLoaded || nerError.code === 'LANGUAGE_NOT_LOADED');
    const showTextFieldError = hasAttemptedSubmit && nerError.code === 'EMPTY_INPUT';
    const entityTypes = useMemo(() => {
        if (!namedEntities) {
            return [] as string[];
        }

        const parser = new DOMParser();
        const parsed = parser.parseFromString(`<div>${namedEntities}</div>`, 'text/html');
        const values = new Set<string>();
        parsed.querySelectorAll('[data-tooltip]').forEach((element) => {
            const tooltip = element.getAttribute('data-tooltip');
            if (tooltip) {
                values.add(tooltip.toUpperCase());
            }
        });
        return Array.from(values).sort();
    }, [namedEntities]);
    const posLegend = useMemo(() => {
        const uniqueTags = Array.from(new Set(partsOfSpeech.map((entry) => (entry.tag || 'UNK').trim().toUpperCase())));
        return uniqueTags
            .sort((a, b) => a.localeCompare(b))
            .map((tag) => ({
                tag,
                ...getPosTagDetails(tag)
            }));
    }, [partsOfSpeech]);

    useEffect(() => {
        if (rawNamedEntities) {
            setNamedEntities(sanitizeNerMarkup(rawNamedEntities, enableTooltipFocus));
        }
    }, [rawNamedEntities, enableTooltipFocus]);

    const applySample = useCallback((sample: { language: string; text: string }) => {
        setLanguage(sample.language);
        setContent(sample.text);
        setRawNamedEntities("");
        setNamedEntities("");
        setPartsOfSpeech([]);
        setNerError(INITIAL_ERROR);
        setHasAttemptedSubmit(false);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const uri = API_ENDPOINTS.logs;

        fetch(uri, { signal: controller.signal })
            .then((response) => response.json())
            .then((result: { running: RunningState }) => {
                setRunning(result.running);
                setStatusFetchError(null);
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
                setStatusFetchError('Language status is temporarily unavailable. Retry shortly or open Setup to refresh language state.');
            });

        return () => controller.abort();
    }, [])

    const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setLanguage(e.target.value);
    }, []);

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    }, []);

    const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setHasAttemptedSubmit(true);

        if (!content.trim()) {
            setRawNamedEntities("");
            setNamedEntities("");
            setPartsOfSpeech([]);
            setNerError({
                code: "EMPTY_INPUT",
                description: "Please provide text to analyze.",
                value: "",
                properties: {}
            });
            return;
        }

        if (!isLanguageLoaded(language)) {
            setRawNamedEntities("");
            setNamedEntities("");
            setPartsOfSpeech([]);
            setNerError({
                code: "LANGUAGE_NOT_LOADED",
                description: `Language '${language}' is not loaded. Load it from Setup before running NER.`,
                value: language,
                properties: {}
            });
            return;
        }

        setIsSubmitting(true);
        setNerError(INITIAL_ERROR);

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: language,
                text: content
            })
        };

        fetch(API_ENDPOINTS.ner, requestOptions)
            .then(async (response) => {
                const raw = await response.text();
                let parsed: NerResponse | null = null;

                try {
                    parsed = raw ? JSON.parse(raw) as NerResponse : null;
                } catch (_parseError) {
                    if (!response.ok) {
                        throw toNerRequestError({
                            code: `HTTP_${response.status}`,
                            description: response.statusText || 'HTTP request failed',
                            value: raw,
                            properties: {}
                        });
                    }

                    throw toNerRequestError({
                        code: "INVALID_JSON",
                        description: "NER service did not return JSON.",
                        value: raw,
                        properties: {}
                    });
                }

                if (!response.ok) {
                    throw toNerRequestError({
                        code: `HTTP_${response.status}`,
                        description: response.statusText || 'HTTP request failed',
                        value: raw,
                        properties: parsed?.properties ?? {}
                    });
                }

                if (!parsed) {
                    throw toNerRequestError({
                        code: "EMPTY_RESPONSE",
                        description: "NER service returned an empty response.",
                        value: "",
                        properties: {}
                    });
                }

                return parsed;
            })
            .then((result: NerResponse) => {
                if (result.text) {
                    setRawNamedEntities(result.text);
                    setNamedEntities(sanitizeNerMarkup(result.text, enableTooltipFocus));
                    setPartsOfSpeech(Array.isArray(result.pos) ? result.pos : []);
                    setNerError(INITIAL_ERROR);
                } else {
                    setRawNamedEntities("");
                    setNamedEntities("");
                    setPartsOfSpeech([]);
                    setNerError({
                        code: result.code ?? "UNKNOWN_ERROR",
                        description: result.description ?? "The service returned an error.",
                        value: result.value ?? "",
                        properties: result.properties ?? {}
                    });
                }
            })
            .catch((error: NerRequestError | undefined) => {
                setRawNamedEntities("");
                setNamedEntities("");
                setPartsOfSpeech([]);
                setNerError({
                    code: error?.code ?? "NETWORK_ERROR",
                    description: error?.description ?? "Unable to reach the NER service.",
                    value: error?.value ?? "",
                    properties: error?.properties ?? {}
                });
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }, [content, language, isLanguageLoaded, enableTooltipFocus]);

    return (
        <div className="page-content">
            <h1>Named Entity Recognition</h1>
            <h2>Examples</h2>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16}}>
                {NER_SAMPLES.map((sample) => (
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
            {statusFetchError ? (
                <div role="alert" style={{ marginBottom: 12, color: '#b00020' }}>
                    {statusFetchError}
                </div>
            ) : null}
            <Form onSubmit={handleSubmit}>
                <Row className={'mb-3'}>
                    <Col md={4}>
                        <Form.Group controlId="ner-language-select">
                            <Form.Label>Select language</Form.Label>
                            <Form.Select
                                name="language"
                                value={language}
                                onChange={handleLanguageChange}
                                aria-invalid={showLanguageFieldError ? true : undefined}
                                aria-describedby={showLanguageFieldError ? languageFieldErrorId : undefined}
                            >
                                <option value="en" disabled={!running.english.isLoaded}>English</option>
                                <option value="english-kbp" disabled={!running["english-kbp"].isLoaded}>English KBP</option>
                                <option value="ar" disabled={!running.arabic.isLoaded}>Arabic</option>
                                <option value="zh" disabled={!running.chinese.isLoaded}>Chinese</option>
                                <option value="fr" disabled={!running.french.isLoaded}>French</option>
                                <option value="de" disabled={!running.german.isLoaded}>German</option>
                                <option value="es" disabled={!running.spanish.isLoaded}>Spanish</option>
                            </Form.Select>
                            {!languageLoaded ? (
                                <Form.Text style={{color: '#8a6d3b'}}>
                                    Language resources are not loaded yet. Open Setup to load this language.
                                </Form.Text>
                            ) : null}
                            {showLanguageFieldError ? (
                                <Form.Text id={languageFieldErrorId} style={{color: '#b00020'}}>
                                    Selected language is not loaded. Use Setup to load it before submitting.
                                </Form.Text>
                            ) : null}
                        </Form.Group>
                    </Col>
                </Row>
                <Form.Group as={Row} className={'mb-3'} controlId="ner-input-text">
                    <Form.Label>Text to find named entities</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={10}
                        value={content}
                        onChange={handleContentChange}
                        aria-invalid={showTextFieldError ? true : undefined}
                        aria-describedby={showTextFieldError ? textFieldErrorId : undefined}
                    />
                    {showTextFieldError ? (
                        <Form.Text id={textFieldErrorId} style={{color: '#b00020'}}>
                            Please provide text to analyze.
                        </Form.Text>
                    ) : null}
                </Form.Group>
                <Form.Group as={Row} className={'mb-3'}>
                    <Col sm={2}>
                        <Button type={'submit'} disabled={isSubmitting || !languageLoaded}>Submit</Button>
                    </Col>
                </Form.Group>
                <Form.Check
                    type="switch"
                    id="ner-tooltip-focus-mode"
                    label="Enable keyboard focus for entity tooltips"
                    checked={enableTooltipFocus}
                    onChange={(e) => setEnableTooltipFocus(e.target.checked)}
                />
                {hasAttemptedSubmit && !languageLoaded ? (
                    <div role="alert" style={{ marginBottom: 12, color: '#b00020' }}>
                        Selected language is not loaded. Use Setup to load it before submitting.
                    </div>
                ) : null}
                {isSubmitting ? (
                    <div style={{ marginBottom: 12, color: '#0d6efd' }} role="status" aria-live="polite">
                        Calling NER API...
                    </div>
                ) : null}
            </Form>
            <section className="ner-results-panel" aria-live="polite">
                <h2>Results</h2>
                <p className="ner-results-hint">Entity spans are color-coded and include a visible type tag, with hover and keyboard tooltips for detail.</p>
                {entityTypes.length > 0 ? (
                    <div className="ner-legend" aria-label="Detected entity types">
                        {entityTypes.map((entityType) => (
                            <span key={entityType} className="ner-legend-chip">{entityType}</span>
                        ))}
                    </div>
                ) : null}
                {namedEntities ? (
                    <div id="NER" className="ner-output" dangerouslySetInnerHTML={{__html: namedEntities}}></div>
                ) : (
                    <div className="ner-output ner-output-empty">Run NER to preview highlighted entity output.</div>
                )}
                <h3 className="ner-subsection-title">Parts of Speech</h3>
                {posLegend.length > 0 ? (
                    <div className="ner-pos-legend" aria-label="Parts of speech tag legend">
                        {posLegend.map((entry) => (
                            <span key={entry.tag} className={`ner-pos-legend-item ner-pos-${entry.category}`}>
                                <b>{entry.tag}</b>
                                <span>{entry.label}</span>
                            </span>
                        ))}
                    </div>
                ) : null}
                {partsOfSpeech.length > 0 ? (
                    <div className="ner-pos-output" data-testid="ner-pos-output" aria-label="Parts of speech annotations">
                        {partsOfSpeech.map((entry, index) => {
                            const posTag = (entry.tag || 'UNK').trim().toUpperCase();
                            const posInfo = getPosTagDetails(posTag);
                            return (
                            <span key={`${entry.token}-${entry.tag}-${index}`} className={`ner-pos-token ner-pos-${posInfo.category}`}>
                                <span className="ner-pos-tag" title={posInfo.label}>{posTag}</span>
                                <span className="ner-pos-word">{entry.token}</span>
                            </span>
                            );
                        })}
                    </div>
                ) : (
                    <div className="ner-pos-output ner-output-empty">POS tags are shown after a successful NER run.</div>
                )}
                <div className="ner-error-panel" role={nerError.code ? 'alert' : undefined} aria-live={nerError.code ? 'assertive' : undefined}>{
                    nerError.code ?
                        <>
                            <div><b>Code</b> <span>{nerError.code}</span></div>
                            <div><b>Description</b> <span>{nerError.description}</span></div>
                            <div><b>Value</b> <span>{nerError.value}</span></div>
                            <pre style={{marginTop: 12, whiteSpace: 'pre-wrap'}}>{JSON.stringify(nerError.properties, null, 2)}</pre>
                        </>
                        : null
                }</div>
            </section>
        </div>
    )

}

export default NERContext;
