xquery version "3.1";

(:~
 : A very simple example XQuery Library Module implemented
 : in XQuery.
 :)
module namespace ner = "http://exist-db.org/xquery/stanford-nlp/ner";

import module namespace nlp="http://exist-db.org/xquery/stanford-nlp";
import module namespace functx = "http://www.functx.com";

import module namespace rest = "http://exquery.org/ns/restxq";

(:~
 : Generates the snippe match string to show the highlighted text for the client.
 :
 : @param $match The match text for a snippet that contains highlighted text
 : @return A string with highlight spans encoded within the string
 :)
declare function ner:stringify($match as node()) as xs:string {
    fn:string-join(
        for $text-or-highlight in $match/node()
        return
        if ($text-or-highlight instance of element()) 
        then
            fn:concat('<span class="',
                      fn:lower-case($text-or-highlight/local-name()),
                      '">', 
                      $text-or-highlight/text(), 
                      '</span>')
        else
            $text-or-highlight
    )
};


(:~
 :)
declare
function ner:classify-document($request-body as document-node(element())) as node() {
    ner:classify-document($request-body, "en")
};

(:~
 :)
declare
function ner:classify-document($request-body as document-node(element()), $language as xs:string) as node() {
    ner:dispatch($request-body/node(), ner:properties-from-language($language))
};

(:~
 :)
declare
function ner:classify-node($node as node()) as node() {
    ner:classify-node($node, "en")
};

(:~
 :)
declare
function ner:classify-node($node as node(), $language as xs:string) as node() {
    ner:dispatch($node, ner:properties-from-language($language))
};

(:~
 :)
declare 
function ner:properties-from-language($language as xs:string) as map(*) {
    try {
        switch ($language)
            case "en" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json")
            case "ar" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-arabic.json")
            case "es" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-spanish.json")
            case "fr" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-french.json")
            case "zh" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-chinese.json")
            case "de" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-german.json")
            default return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json")
    } catch * {
        fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json")
    }
};

(:~
 :)
declare
    %rest:GET
    %rest:path("/StanfordNLP/NER")
    %rest:query-param("text", "{$text}")
    %rest:query-param("lang", "{$language}", "en")
    %rest:produces("application/xml")
function ner:query-text-as-xml($text as xs:string*, $language as xs:string*) as node() {
    element { 'ner' } { 
            ner:classify(
                    util:unescape-uri($text[1], "UTF-8"), 
                    ner:properties-from-language($language[1])
            ) 
    }
};

(:~
 :)
declare
    %rest:GET
    %rest:path("/StanfordNLP/NER")
    %rest:query-param("text", "{$text}")
    %rest:query-param("lang", "{$language}")
    %rest:produces("application/json")
function ner:query-text-as-json($text as xs:string*, $language as xs:string*) as map(*) {
    map { 
        'text' : 
            ner:stringify(
                ner:classify(
                    util:unescape-uri($text[1], "UTF-8"), 
                    ner:properties-from-language($language[1])
                )
            ) 
    }
};

(:~
 :)
declare function ner:sibling($token as node(), $tokens as node()*) as node() {
    if (count($tokens) = 0) then $token else
    let $next-token := $tokens[1]
    let $next-seq := fn:subsequence($tokens, 2)
    let $token-index := xs:integer($token/@id)
    let $next-token-index := xs:integer($next-token/@id)
    return
    if ($next-token-index = ($token-index - 1))
    then if ($next-token/NER/text() eq $token/NER/text())
    then
        let $return-token := ner:sibling($next-token, $next-seq)
        return $return-token
    else $token
    else $token
};

(:~
 :)
declare function ner:enrich($text as xs:string, $tokens as node()*) {
    if (fn:count($tokens) eq 0)
    then
        $text
    else
        let $last-token := $tokens[1]
        let $sibling-token := ner:sibling($last-token, fn:subsequence($tokens, 2))
        let $start := $sibling-token/CharacterOffsetBegin/number() + 1
        let $end := $last-token/CharacterOffsetEnd/number() + 1
        let $length := $end - $start
        let $before := fn:substring($text, 1, $start - 1)
        let $after := fn:substring($text, $end)
        let $ner-text := fn:substring($text, $start, $length)
        let $next := fn:subsequence($tokens, fn:index-of($tokens, $sibling-token) + 1)
        return (
            ner:enrich($before, $next), 
            element { $last-token/NER/text() } { $ner-text }, 
            if (fn:string-length($after) gt 0) then $after else ())
    
};

(:~
 :)
declare function ner:dispatch($node as node()?, $annotators as map(*)) {
    if ($node)
    then
        if (functx:has-simple-content($node))
        then element { $node/name() } { $node/@*, ner:classify($node/text(), $annotators) }
        else ner:pass-through($node, $annotators)
        else ()
};

(:~
 :)
declare function ner:pass-through($node as node()?, $annotators as map(*)) {
    if ($node)
    then element { $node/name() } { 
        $node/@*,  
        for $cnode in $node/* 
        return ner:dispatch($cnode, $annotators)
    }
    else ()
};

(:~
 :)
declare function ner:classify($text as xs:string, $annotators as map(*)) {
let $tokens := for $token in nlp:parse($text, $annotators)//token[fn:not(NER = "O")]
                let $token-start := $token/CharacterOffsetBegin/number()
                order by $token-start descending
            return $token
return ner:enrich($text, $tokens)    
};
