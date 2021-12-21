xquery version "3.1";

(:~
 : A very simple example XQuery Library Module implemented
 : in XQuery.
 :)
module namespace ner = "http://exist-db.org/xquery/stanford-nlp/ner";

import module namespace nlp="http://exist-db.org/xquery/stanford-nlp";
import module namespace functx = "http://www.functx.com";

import module namespace rest = "http://exquery.org/ns/restxq";

declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare namespace array = "http://www.w3.org/2005/xpath-functions/array";
declare namespace map = "http://www.w3.org/2005/xpath-functions/map";

(:~
 : Generates the snippet match string to show the highlighted text for the client.
 :
 : @param $match The match text for a snippet that contains highlighted text
 : @return A string with highlight spans encoded within the string
 :)
declare function ner:stringify($match) as xs:string {
    fn:string-join(
        for $text-or-highlight in $match
        return
        if ($text-or-highlight instance of element())
        then
            fn:concat('<span',
            ' class="', fn:lower-case($text-or-highlight/local-name()), '"',
                   ' data-tooltip="', fn:lower-case($text-or-highlight/local-name()), '"',
                      ' data-tooltip-position="bottom" >',
                      $text-or-highlight/text(),
                      '</span>')
        else
            $text-or-highlight
    )
};


(:~
 : This method runs the ner:clasify($text, $properties) on the leaf nodes of the
 : document for the defaults for the English language.  The english defaults are
 : in the file /db/apps/stanford-nlp/data/StanfordCoreNLP-english.json
 : @param $request-body The document to process.
 :)
declare
function ner:classify-document($request-body as document-node(element())) as node() {
    ner:classify-document($request-body, "en")
};

(:~
 : This method runs the ner:clasify($text, $properties) on the leaf nodes of the
 : document for the language specified.
 : @param $request-body The document to process.
 : @param $language The two character string to identify the language to process.
 : @see ner:properties-from-language()
 :)
declare
function ner:classify-document($request-body as document-node(element()), $language as xs:string) as node() {
    ner:dispatch($request-body/node(), ner:properties-from-language($language))
};

(:~
 : This method runs the ner:clasify($text, $properties) on the leaf nodes of the
 : XML identitied by $node for the defaults for the English language.  The english defaults are
 : in the file /db/apps/stanford-nlp/data/StanfordCoreNLP-english.json
 : @param $node The node to process.
 :)
declare
function ner:classify-node($node as node()) as node() {
    ner:classify-node($node, "en")
};

(:~
 : This method runs the ner:clasify($text, $properties) on the leaf nodes of the
 : node for the language specified.
 : @param $node The node to process.
 : @param $language The two character string to identify the language to process.
 : @see ner:properties-from-language()
 :)
declare
function ner:classify-node($node as node(), $language as xs:string) as node() {
    ner:dispatch($node, ner:properties-from-language($language))
};

(:~
 : Loads the JSON document language default file for the identified language &lt;br&gt;
 :  en => /db/apps/stanford-nlp/data/StanfordCoreNLP-english.json &lt;br&gt;
 :  ar => /db/apps/stanford-nlp/data/StanfordCoreNLP-arabic.json &lt;br&gt;
 :  es => /db/apps/stanford-nlp/data/StanfordCoreNLP-spanish.json &lt;br&gt;
 :  fr => /db/apps/stanford-nlp/data/StanfordCoreNLP-french.json &lt;br&gt;
 :  zh => /db/apps/stanford-nlp/data/StanfordCoreNLP-chinese.json &lt;br&gt;
 :  de => /db/apps/stanford-nlp/data/StanfordCoreNLP-german.json &lt;br&gt;
 : Any other value loads the english defaults.
 : @param $language The two character string to identify the language for the default JSON document.
 :)
declare
function ner:properties-from-language($language as xs:string) as map(*) {
    switch ($language)
        case "en" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json")
        case "ar" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-arabic.json")
        case "es" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-spanish.json")
        case "fr" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-french.json")
        case "zh" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-chinese.json")
        case "de" return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-german.json")
        default return fn:json-doc("/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json")
};

(:~
 : This method runs the ner:clasify($text, $properties) on the text passed in for the language specified.
 : @param $text The text to process.
 : @param $language The two character string to identify the language to process.
 : @see ner:properties-from-language()
 : @return An XML node
 : @custom:openapi-tag Natural Language Processing
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
 : This method runs the ner:clasify($text, $properties) on the leaf nodes of the
 : node for the properties of the language.
 : @param $node The node to process.
 : @param $properties The map of the values for proceessing the pipeline.
 : @see ner:properties-from-language()
 :)
declare function ner:dispatch($node as node()?, $properties as map(*)) {
    if ($node)
    then
        if (functx:has-simple-content($node))
        then element { $node/name() } { $node/@*, ner:classify($node/text(), $properties) }
        else ner:pass-through($node, $properties)
        else ()
};

(:~
 :)
declare function ner:pass-through($node as node()?, $properties as map(*)) {
    if ($node)
    then element { $node/name() } {
        $node/@*,
        for $cnode in $node/*
        return ner:dispatch($cnode, $properties)
    }
    else ()
};

(:~
 : @param $text
 : @param $properties
 :)
declare function ner:classify($text as xs:string, $properties as map(*)) {
let $tokens := for $token in nlp:parse($text, $properties)//token[fn:not(NER = "O")]
                let $token-start := $token/CharacterOffsetBegin/number()
                order by $token-start descending
            return $token
return ner:enrich($text, $tokens)
};
