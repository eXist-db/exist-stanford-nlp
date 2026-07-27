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

function NERContext() {

    const [running, setRunning] = useState<RunningState>(INITIAL_RUNNING);

    const [language, setLanguage] = useState("en");
    const [content, setContent] = useState("");
    const [namedEntities, setNamedEntities] = useState("");
    const [nerError, setNerError] = useState<NerError>(INITIAL_ERROR);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            .then((response) => response.json())
            .then((result: { text?: string } & NerError) => {
                if (result.text) {
                    setNamedEntities(result.text);
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
            .catch(() => {
                setNamedEntities("");
                setNerError({
                    code: "NETWORK_ERROR",
                    description: "Unable to reach the NER service.",
                    value: "",
                    properties: {}
                });
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }, [content, language]);

    return (
        <div style={{padding: 35}}>
            <Form onSubmit={handleSubmit}>
                <Row className={'mb-3'}>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>Select language</Form.Label>
                            <Form.Select name="language" value={language} onChange={handleLanguageChange}>
                                <option value="en" disabled={!running.english.isLoaded}>English</option>
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
                        <Button type={'submit'} disabled={isSubmitting}>Submit</Button>
                    </Col>
                </Form.Group>
            </Form>
            <Row>
                <div>Results</div>
                <hr/>
                <div id="NER" dangerouslySetInnerHTML={{__html: namedEntities}}></div>
                <div>{
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
