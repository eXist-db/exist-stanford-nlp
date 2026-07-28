xquery version "3.1";

module namespace nerapi = "http://exist-db.org/xquery/stanford-nlp/api";
import module namespace ner = "http://exist-db.org/xquery/stanford-nlp/ner" at "/db/apps/stanford-nlp/content/ner-module.xqm";
import module namespace scheduler = "http://exist-db.org/xquery/scheduler";
import module namespace xmldb = "http://exist-db.org/xquery/xmldb";
import module namespace util = "http://exist-db.org/xquery/util";

declare namespace rest = "http://exquery.org/ns/restxq";
declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";

declare variable $nerapi:rag-root := "/db/apps/stanford-nlp/data/rag";
declare variable $nerapi:chunk-root := "/db/apps/stanford-nlp/data/rag/chunks";

declare function nerapi:mkcol-recursive($collection as xs:string, $components as xs:string*) {
    if (exists($components)) then
        let $new-coll := concat($collection, "/", $components[1])
        return (
            if (xmldb:collection-available($new-coll)) then () else xmldb:create-collection($collection, $components[1]),
            nerapi:mkcol-recursive($new-coll, subsequence($components, 2))
        )
    else
        ()
};

declare function nerapi:mkcol($collection as xs:string, $path as xs:string) {
    nerapi:mkcol-recursive($collection, tokenize($path, "/"))
};

declare function nerapi:ensure-storage() {
    nerapi:mkcol("/db/apps/stanford-nlp/data", "rag/chunks")
};

declare function nerapi:normalized-tokens($text as xs:string?) as xs:string* {
    for $token in tokenize(lower-case(normalize-space($text)), "[^\\p{L}\\p{N}]+")
    where string-length($token) gt 0
    return $token
};

declare function nerapi:chunk-word-sequences($words as xs:string*, $size as xs:integer, $step as xs:integer, $start as xs:integer) as xs:string* {
    if ($start gt count($words)) then
        ()
    else
        (
            string-join(subsequence($words, $start, $size), " "),
            nerapi:chunk-word-sequences($words, $size, $step, $start + $step)
        )
};

declare function nerapi:prepare-chunks($text as xs:string, $chunk-size as xs:integer, $overlap as xs:integer) as xs:string* {
    let $size := if ($chunk-size gt 0) then $chunk-size else 120
    let $ov := if ($overlap ge 0) then $overlap else 20
    let $step := if (($size - $ov) gt 0) then ($size - $ov) else $size
    let $words := tokenize(normalize-space($text), "\\s+")
    return
        if (count($words) = 0) then
            ()
        else
            nerapi:chunk-word-sequences($words, $size, $step, 1)
};

declare function nerapi:entity-types($text as xs:string, $language as xs:string) as xs:string* {
    let $classified := ner:classify($text, ner:properties-from-language($language))
    return distinct-values(
        for $node in $classified
        where $node instance of element()
        return lower-case(local-name($node))
    )
};

declare function nerapi:store-chunk(
    $doc-id as xs:string,
    $language as xs:string,
    $chunk as xs:string,
    $index as xs:integer,
    $source-uri as xs:string?
) as map(*) {
    let $chunk-id := concat($doc-id, "-", format-integer($index, "00000"), "-", substring(util:uuid(), 1, 8))
    let $entities := nerapi:entity-types($chunk, $language)
    let $payload := map {
        "chunkId": $chunk-id,
        "docId": $doc-id,
        "sourceUri": if (exists($source-uri) and normalize-space($source-uri) ne "") then $source-uri else $doc-id,
        "language": $language,
        "text": $chunk,
        "entities": array { for $entity in $entities return $entity },
        "createdAt": string(current-dateTime())
    }
    let $file-name := concat($chunk-id, ".json")
    let $stored := xmldb:store(
        $nerapi:chunk-root,
        $file-name,
        serialize($payload, map { "method": "json", "indent": true() })
    )
    return map {
        "chunkId": $chunk-id,
        "resource": $file-name,
        "entityCount": count($entities)
    }
};

declare function nerapi:score-chunk(
    $chunk as map(*),
    $query-tokens as xs:string*,
    $query-entities as xs:string*
) as map(*) {
    let $chunk-tokens := distinct-values(nerapi:normalized-tokens(string($chunk?text)))
    let $token-overlap := count($query-tokens[. = $chunk-tokens])
    let $lexical-score := if (count($query-tokens) gt 0) then ($token-overlap div count($query-tokens)) else 0
    let $chunk-entities :=
        if (exists($chunk?entities))
        then for $entity in $chunk?entities?* return string($entity)
        else ()
    let $entity-overlap := count($query-entities[. = $chunk-entities])
    let $entity-score := if (count($query-entities) gt 0) then ($entity-overlap div count($query-entities)) else 0
    let $final-score := ($lexical-score * 0.7) + ($entity-score * 0.3)
    return map {
        "chunkId": string($chunk?chunkId),
        "docId": string($chunk?docId),
        "sourceUri": string($chunk?sourceUri),
        "language": string($chunk?language),
        "text": string($chunk?text),
        "entities": if (exists($chunk?entities)) then $chunk?entities else array {},
        "score": round-half-to-even($final-score, 4)
    }
};


declare function nerapi:schedule-language($language as xs:string*) as map(*)
{
    let $qq := update delete fn:doc("/db/apps/stanford-nlp/data/log.xml")//logs/log[@language = $language]
    let $a :=
    scheduler:schedule-xquery-periodic-job(
        "/db/apps/stanford-nlp/modules/load.xq",
        500,
        "nlp-load-" || $language || "-" || util:uuid(),
        <parameters><param name="language" value="{$language}" /></parameters>,
        1000,
        0
    )
    return
        map {
            "language": fn:string($language[1]),
            "status": fn:true()
        }
};

(:~
  Start the loading of a language resource through a background process
  @param $language The language to be loaded
  @author Loren Cahlander
  @version 1.0
  @since 1.0
  @custom:openapi-tag Natural Language Processing
 :)
declare
%rest:GET
%rest:path("/stanford/nlp/load/{$language}")
%rest:produces("application/json")
%output:media-type("application/json")
%output:method("json")
function nerapi:load-language(
$language as xs:string*
) as map(*)
{
    switch ($language)
    case "arabic"
        return nerapi:schedule-language($language)

    case "chinese"
        return nerapi:schedule-language($language)

    case "english"
        return nerapi:schedule-language($language)

    case "english-kbp"
        return nerapi:schedule-language($language)

    case "french"
        return nerapi:schedule-language($language)

    case "german"
        return nerapi:schedule-language($language)

    case "spanish"
        return nerapi:schedule-language($language)

    default
        return
            map {
                "status": fn:false(),
                "languages": array {('arabic', 'chinese', 'english', 'english-kbp', 'french', 'german', 'spanish')}
            }
};

(:~
  Start the loading of a language resource through a background process
  @author Loren Cahlander
  @version 1.0
  @since 1.0
  @custom:openapi-tag Natural Language Processing
 :)
declare
%rest:GET
%rest:path("/stanford/nlp/logs")
%rest:query-param("timestamp", "{$timestamp}")
%rest:produces("application/json")
%output:media-type("application/json")
%output:method("json")
function nerapi:logs($timestamp as xs:string*) as map(*)
{
    let $allLogs := fn:doc("/db/apps/stanford-nlp/data/log.xml")//logs/log
    let $logs := if (fn:exists($timestamp))
                 then $allLogs[@timestamp ge $timestamp]
                 else $allLogs
    let $languages := fn:sort(fn:distinct-values($allLogs/@language/string()))
    return
        map {
            "timestamp": fn:current-dateTime(),
            "running": map:merge(
                for $language in ('arabic', 'chinese', 'english', 'english-kbp', 'french', 'german', 'spanish')
                let $running := $allLogs[@language = $language]
                let $start := fn:max($running[. = "start"]/@timestamp/string())
                let $end := fn:max($running[. = "end"]/@timestamp/string())
                let $error := fn:max($running[fn:starts-with(., "error:")]/@timestamp/string())
                let $isRunning :=
                    fn:exists($start)
                    and (
                        (fn:not(fn:exists($end)) or $end le $start)
                        and (fn:not(fn:exists($error)) or $error le $start)
                    )
                let $isLoaded := fn:exists($end) and (fn:not(fn:exists($error)) or $end ge $error)
                return
                    map {
                        $language: map {
                        "start": $start,
                        "end": if ($isRunning) then () else $end,
                        "isRunning": $isRunning,
                        "isLoaded": $isLoaded
                        }
                    }
            ),
            "logs":
                array {
                    for $log in $logs
                    let $timestamp := xs:string($log/@timestamp)
                    let $language := xs:string($log/@language)
                    let $text := fn:string-join($log/text() ! fn:string(.), "")
                    order by $timestamp descending
                    return
                        map {
                            'timestamp': $timestamp,
                            'language': $language,
                            'message': $text
                        }
                }
        }
};

(:~
 : This method runs the ner:clasify($text, $properties) on the text passed in for the language specified.
 : @param $content the properties of the source graph in a JSON object
 : @see ner:properties-from-language()
 : @return A map
 : @custom:openapi-tag Natural Language Processing
 :)
declare
    %rest:POST("{$content}")
    %rest:path("/Stanford/ner")
    %rest:consumes("application/json")
    %rest:produces("application/json")
    %output:media-type("application/json")
    %output:method("json")
function nerapi:query-text-as-json($content as xs:string) as map(*) {
    let $postBody := fn:parse-json(util:base64-decode($content))
    let $properties := ner:properties-from-language($postBody?language)
    let $classified := ner:classify($postBody?text, $properties)
    return
        try {
    map {
        'text' : ner:stringify($classified)
    }
        } catch * {
            map {
                'code': $err:code,
                'description': $err:description,
                'value': $err:value,
                'properties': $properties
            }
        }
};

(:~
 : Ingests source text, chunks it, enriches chunks with NER entities, and stores
 : chunk metadata as JSON documents for retrieval workflows.
 :)
declare
    %rest:POST("{$content}")
    %rest:path("/stanford/rag/ingest")
    %rest:consumes("application/json")
    %rest:produces("application/json")
    %output:media-type("application/json")
    %output:method("json")
function nerapi:rag-ingest($content as xs:string) as map(*) {
    let $body := parse-json(util:base64-decode($content))
    let $text := normalize-space(string($body?text))
    return
        if ($text = "") then
            map {
                "status": false(),
                "error": "text is required"
            }
        else
            let $doc-id :=
                if (exists($body?docId) and normalize-space(string($body?docId)) ne "")
                then string($body?docId)
                else concat("doc-", util:uuid())
            let $language :=
                if (exists($body?language) and normalize-space(string($body?language)) ne "")
                then string($body?language)
                else "en"
            let $chunk-size :=
                if (exists($body?chunkSize))
                then xs:integer($body?chunkSize)
                else 120
            let $overlap :=
                if (exists($body?overlap))
                then xs:integer($body?overlap)
                else 20
            let $source-uri := if (exists($body?sourceUri)) then string($body?sourceUri) else $doc-id
            let $ensure := nerapi:ensure-storage()
            let $chunks := nerapi:prepare-chunks($text, $chunk-size, $overlap)
            let $stored :=
                for $chunk at $index in $chunks
                return nerapi:store-chunk($doc-id, $language, $chunk, xs:integer($index), $source-uri)
            return map {
                "status": true(),
                "docId": $doc-id,
                "language": $language,
                "chunksIngested": count($stored),
                "chunkIds": array { for $entry in $stored return $entry?chunkId }
            }
};

(:~
 : Retrieves top matching chunks using lexical overlap and NER entity overlap.
 :)
declare
    %rest:GET
    %rest:path("/stanford/rag/search")
    %rest:query-param("q", "{$q}")
    %rest:query-param("lang", "{$lang}", "en")
    %rest:query-param("topK", "{$topK}", 5)
    %rest:produces("application/json")
    %output:media-type("application/json")
    %output:method("json")
function nerapi:rag-search($q as xs:string*, $lang as xs:string*, $topK as xs:integer*) as map(*) {
    let $query := normalize-space($q[1])
    return
        if ($query = "") then
            map {
                "status": false(),
                "error": "q is required",
                "results": array {}
            }
        else
            let $ensure := nerapi:ensure-storage()
            let $language := if (exists($lang[1])) then string($lang[1]) else "en"
            let $k := if (exists($topK[1]) and $topK[1] gt 0) then $topK[1] else 5
            let $query-tokens := distinct-values(nerapi:normalized-tokens($query))
            let $query-entities := nerapi:entity-types($query, $language)
            let $resources :=
                if (xmldb:collection-available($nerapi:chunk-root))
                then xmldb:get-child-resources($nerapi:chunk-root)
                else ()
            let $scored :=
                for $resource in $resources
                let $chunk := json-doc(concat($nerapi:chunk-root, "/", $resource))
                let $result := nerapi:score-chunk($chunk, $query-tokens, $query-entities)
                where $result?score gt 0
                order by $result?score descending, $result?chunkId ascending
                return $result
            let $top := subsequence($scored, 1, $k)
            return map {
                "status": true(),
                "query": $query,
                "language": $language,
                "queryEntities": array { for $entity in $query-entities return $entity },
                "results": array { $top }
            }
};

(:~
 : Deletes all indexed RAG chunks from the app data collection.
 :)
declare
    %rest:GET
    %rest:path("/stanford/rag/clear")
    %rest:produces("application/json")
    %output:media-type("application/json")
    %output:method("json")
function nerapi:rag-clear() as map(*) {
    let $resources :=
        if (xmldb:collection-available($nerapi:chunk-root))
        then xmldb:get-child-resources($nerapi:chunk-root)
        else ()
    let $removed :=
        for $resource in $resources
        return xmldb:remove($nerapi:chunk-root, $resource)
    return map {
        "status": true(),
        "removed": count($removed)
    }
};

