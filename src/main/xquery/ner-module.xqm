xquery version "3.1";

(:~
 : A very simple example XQuery Library Module implemented
 : in XQuery.
 :)
module namespace ner = "http://exist-db.org/xquery/stanford-nlp/ner";

import module namespace nlp="http://exist-db.org/xquery/stanford-nlp";
import module namespace functx = "http://www.functx.com";

declare namespace rest="http://exquery.org/ns/restxq";
declare namespace output="http://www.w3.org/2010/xslt-xquery-serialization";

(:
declare
  %rest:path("/StanfordNLP/NER")
  %rest:PUT("{$request-body}")
function ner:classify-document($request-body as document-node(element())) {
    let $annotators := fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json")
    return ner:dispatch($request-body/node(), $annotators)
};
:)

declare
function ner:classify-node($node as node()) {
    let $annotators := fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json")
    return ner:dispatch($node, $annotators)
};

declare
    %rest:GET
    %rest:path("/StanfordNLP/NER")
    %rest:query-param("text", "{$text}")
    %rest:produces("application/xml", "text/xml")
function ner:query-text($text as xs:string) {
    let $annotators := fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json")
    return element { 'ner' } { ner:classify($text, $annotators) }
};

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

declare function ner:enrich($text as xs:string, $tokens as node()*) {
    if (fn:count($tokens) eq 0)
    then 
        $text
    else    
        let $last-token := $tokens[1]
        let $sibling-token := ner:sibling($last-token, fn:subsequence($tokens, 2))
        let $sibling-position := fn:index-of($tokens, $sibling-token)
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

declare function ner:dispatch($node as node()?, $annotators as map(*)) {
    if ($node)
    then
        if (functx:has-simple-content($node))
        then element { $node/name() } { $node/@*, ner:classify($node/text(), $annotators) }
        else ner:pass-through($node, $annotators)
        else ()
};

declare function ner:pass-through($node as node()?, $annotators as map(*)) {
    if ($node)
    then element { $node/name() } { 
        $node/@*,  
        for $cnode in $node/* 
        return ner:dispatch($cnode, $annotators)
    }
    else ()
};

declare function ner:classify($text as xs:string, $annotators as map(*)) {
let $tokens := for $token in nlp:parse($text, $annotators)//token[fn:not(NER = "O")]
                let $token-start := $token/CharacterOffsetBegin/number()
                order by $token-start descending
            return $token
return ner:enrich($text, $tokens)    
};
