import 'bootstrap/dist/css/bootstrap.min.css';
import React, { FormEvent, useCallback, useEffect, useState } from "react";
import './App.css';
import {Button, Col, Form, Row} from "react-bootstrap";

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

function sanitizeNerMarkup(rawMarkup: string): string {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<div>${rawMarkup}</div>`, 'text/html');
    const sourceRoot = parsed.body.firstElementChild;
    const safeRoot = document.createElement('div');

    if (!sourceRoot) {
        return '';
    }

    const safeTooltipPositions = new Set(['top', 'right', 'bottom', 'left']);

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
                    safeSpan.setAttribute('data-tooltip', tooltip.trim());
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

function NERContext() {

    const [running, setRunning] = useState<RunningState>(INITIAL_RUNNING);

    const [language, setLanguage] = useState("en");
    const [content, setContent] = useState("");
    const [namedEntities, setNamedEntities] = useState("");
    const [nerError, setNerError] = useState<NerError>(INITIAL_ERROR);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const applySample = useCallback((sample: { language: string; text: string }) => {
        setLanguage(sample.language);
        setContent(sample.text);
        setNamedEntities("");
        setNerError(INITIAL_ERROR);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const uri = '/exist/restxq/stanford/nlp/logs';

        fetch(uri, { signal: controller.signal })
            .then((response) => response.json())
            .then((result: { running: RunningState }) => {
                setRunning(result.running);
            })
            .catch(() => {
                // Ignore one-off availability failures and keep defaults.
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

        if (!content.trim()) {
            setNamedEntities("");
            setNerError({
                code: "EMPTY_INPUT",
                description: "Please provide text to analyze.",
                value: "",
                properties: {}
            });
            return;
        }

        if (!isLanguageLoaded(language)) {
            setNamedEntities("");
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

        fetch("/exist/restxq/Stanford/ner", requestOptions)
            .then(async (response) => {
                const raw = await response.text();
                let parsed: ({ text?: string } & NerError) | null = null;

                try {
                    parsed = raw ? JSON.parse(raw) as ({ text?: string } & NerError) : null;
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
            .then((result: { text?: string } & NerError) => {
                if (result.text) {
                    setNamedEntities(sanitizeNerMarkup(result.text));
                    setNerError(INITIAL_ERROR);
                } else {
                    setNamedEntities("");
                    setNerError({
                        code: result.code ?? "UNKNOWN_ERROR",
                        description: result.description ?? "The service returned an error.",
                        value: result.value ?? "",
                        properties: result.properties ?? {}
                    });
                }
            })
            .catch((error: NerRequestError | undefined) => {
                setNamedEntities("");
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
    }, [content, language, isLanguageLoaded]);

    return (
        <div style={{padding: 35}}>
            <h3>Examples</h3>
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
            <Form onSubmit={handleSubmit}>
                <Row className={'mb-3'}>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>Select language</Form.Label>
                            <Form.Select name="language" value={language} onChange={handleLanguageChange}>
                                <option value="en" disabled={!running.english.isLoaded}>English</option>
                                <option value="english-kbp" disabled={!running["english-kbp"].isLoaded}>English KBP</option>
                                <option value="ar" disabled={!running.arabic.isLoaded}>Arabic</option>
                                <option value="zh" disabled={!running.chinese.isLoaded}>Chinese</option>
                                <option value="fr" disabled={!running.french.isLoaded}>French</option>
                                <option value="de" disabled={!running.german.isLoaded}>German</option>
                                <option value="es" disabled={!running.spanish.isLoaded}>Spanish</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Form.Group as={Row} className={'mb-3'}>
                    <Form.Label>Text to find named entities</Form.Label>
                    <Form.Control as="textarea" rows={10} value={content} onChange={handleContentChange} />
                </Form.Group>
                <Form.Group as={Row} className={'mb-3'}>
                    <Col sm={2}>
                        <Button type={'submit'} disabled={isSubmitting || !languageLoaded}>Submit</Button>
                    </Col>
                </Form.Group>
                {!languageLoaded ? (
                    <div style={{ marginBottom: 12, color: '#b00020' }}>
                        Selected language is not loaded. Use Setup to load it before submitting.
                    </div>
                ) : null}
                {isSubmitting ? (
                    <div style={{ marginBottom: 12, color: '#0d6efd' }} role="status" aria-live="polite">
                        Calling NER API...
                    </div>
                ) : null}
            </Form>
            <Row>
                <div>Results</div>
                <hr/>
                <div id="NER" dangerouslySetInnerHTML={{__html: namedEntities}}></div>
                <div role={nerError.code ? 'alert' : undefined} aria-live={nerError.code ? 'assertive' : undefined}>{
                    nerError.code ?
                        <>
                            <div><b>Code</b> <span>{nerError.code}</span></div>
                            <div><b>Description</b> <span>{nerError.description}</span></div>
                            <div><b>Value</b> <span>{nerError.value}</span></div>
                            <pre style={{marginTop: 12, whiteSpace: 'pre-wrap'}}>{JSON.stringify(nerError.properties, null, 2)}</pre>
                        </>
                        : null
                }</div>
                <hr/>
            </Row>
        </div>
    )

}

export default NERContext;
