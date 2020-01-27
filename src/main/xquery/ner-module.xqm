xquery version "3.1";

(:~
 : A very simple example XQuery Library Module implemented
 : in XQuery.
 :)
module namespace neren = "http://exist-db.org/xquery/stanford-nlp/ner/english";

import module namespace nlp-en="http://exist-db.org/xquery/stanford-nlp/english";
import module namespace functx = "http://www.functx.com";
import module namespace console = "http://exist-db.org/xquery/console";

declare namespace rest = "http://exquery.org/ns/restxq";

declare
  %rest:path("/StanfordNLP/NER/english")
  %rest:PUT("{$request-body}")
function neren:classify-document($request-body as document-node(element())) {
    let $annotators := "tokenize, ssplit, pos, lemma, ner"
    return neren:dispatch($request-body/node(), $annotators)
};

declare
function neren:classify-node($node as node()) {
    let $annotators := "tokenize, ssplit, pos, lemma, ner"
    return neren:dispatch($node, $annotators)
};

declare
    %rest:path("/StanfordNLP/NER/english")
    %rest:form-param("text", "{$text}")
function neren:classify-text($text as xs:string) {
    let $annotators := "tokenize, ssplit, pos, lemma, ner"
    return neren:classify($node/text(), $annotators)
};

declare function neren:sibling($token as node(), $tokens as node()*) as node() {
    if (count($tokens) = 0) then $token else
    let $next-token := $tokens[1]
    let $next-seq := fn:subsequence($tokens, 2)
    let $token-index := xs:integer($token/@id)
    let $next-token-index := xs:integer($next-token/@id)
    return
    if ($next-token-index = ($token-index - 1))
    then if ($next-token/NER/text() eq $token/NER/text())
    then
        let $return-token := neren:sibling($next-token, $next-seq)
        return $return-token
    else $token
    else $token
};

declare function neren:enrich($text as xs:string, $tokens as node()*) {
    if (fn:count($tokens) eq 0)
    then 
        $text
    else    
        let $last-token := $tokens[1]
        let $sibling-token := neren:sibling($last-token, fn:subsequence($tokens, 2))
        let $sibling-position := fn:index-of($tokens, $sibling-token)
        let $start := $sibling-token/CharacterOffsetBegin/number() + 1
        let $end := $last-token/CharacterOffsetEnd/number() + 1
        let $length := $end - $start
        let $before := fn:substring($text, 1, $start - 1)
        let $after := fn:substring($text, $end)
        let $ner-text := fn:substring($text, $start, $length)
        let $next := fn:subsequence($tokens, fn:index-of($tokens, $sibling-token) + 1)
        return (
            neren:enrich($before, $next), 
            element { $last-token/NER/text() } { $ner-text }, 
            if (fn:string-length($after) gt 0) then $after else ())
    
};

declare function neren:dispatch($node as node()?, $annotators as xs:string) {
    if ($node)
    then
        if (functx:has-simple-content($node))
        then element { $node/name() } { $node/@*, neren:classify($node/text(), $annotators) }
        else neren:pass-through($node, $annotators)
        else ()
};

declare function neren:pass-through($node as node()?, $annotators as xs:string) {
    if ($node)
    then element { $node/name() } { 
        $node/@*,  
        for $cnode in $node/* 
        return neren:dispatch($cnode, $annotators)
    }
    else ()
};

declare function neren:classify($text as xs:string, $annotators as xs:string) {
let $tokens := for $token in nlp-en:classify-string($annotators, $text)//token[fn:not(NER = "O")]
                let $token-start := $token/CharacterOffsetBegin/number()
                order by $token-start descending
            return $token
return neren:enrich($text, $tokens)    
};
