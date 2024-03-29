xquery version "3.1";

import module namespace config = "http://exist-db.org/apps/stanford-nlp/config";

import module namespace http = "http://expath.org/ns/http-client";
import module namespace compression = "http://exist-db.org/xquery/compression";
import module namespace functx = "http://www.functx.com";
import module namespace util = "http://exist-db.org/xquery/util";
import module namespace map = "http://www.w3.org/2005/xpath-functions/map";
import module namespace xmldb = "http://exist-db.org/xquery/xmldb";


declare variable $local:language external;


declare function local:mkcol-recursive($collection, $components) {
    if (exists($components)) then
        let $newColl := concat($collection, "/", $components[1])
        return (
            if (xmldb:collection-available($newColl))
            then ()
            else xmldb:create-collection($collection, $components[1]),
            local:mkcol-recursive($newColl, subsequence($components, 2))
        )
    else
        ()
};

declare function local:mkcol($collection, $path) {
    local:mkcol-recursive($collection, tokenize($path, "/"))
};


declare function local:entry-data($path as xs:anyURI, $type as xs:string, $data as item()?, $param as item()*) as item()?
{
    let $path-before := functx:substring-before-last($path, "/")
    let $resource-name := functx:substring-after-last($path, "/")
    let $coll := local:mkcol("/db/apps/stanford-nlp/data", $path-before)
    let $decided :=
            if (fn:ends-with($resource-name, ".properties"))
            then
                let $nl := "&#10;"
                let $lines := fn:tokenize(util:binary-to-string($data, "UTF-8"), $nl)
                let $content := map:merge(
                        for $line in $lines
                        return
                            if (fn:starts-with($line, "#"))
                            then ()
                            else if (fn:contains($line, "="))
                            then
                                let $key := functx:trim(fn:substring-before($line, "="))
                                let $after := functx:trim(fn:substring-after($line, "="))
                                let $value :=
                                    if (fn:exists($after) and fn:string-length($after) gt 0)
                                    then
                                        for $token in fn:tokenize($after, ",")
                                        let $trimmed := functx:trim($token)
                                        let $val :=
                                            if (fn:starts-with($trimmed, "edu/"))
                                            then "http://localhost:8080/exist/apps/stanford-nlp/data/" || $trimmed
                                            else $trimmed
                                        return $val
                                    else ""
                                return map:entry($key, $value)
                            else ()
                    )
                return xmldb:store(
                            "/db/apps/stanford-nlp/data/" || $path-before,
                            fn:replace($resource-name, ".properties", ".json"),
                            fn:serialize($content, map { "method": "json", "indent": true() })
                        )
            else ()
    let $stored := xmldb:store-as-binary("/db/apps/stanford-nlp/data/" || $path-before, $resource-name, $data)
    let $log := local:log("item path=[" || $path || "] type=[" || $type || "]")
    return ()
};

declare function local:entry-filter($path as xs:anyURI, $type as xs:string, $param as item()*) as xs:boolean
{
	$type = "resource"
};

declare function local:log($message as xs:string)
{
    update insert
        element { 'log' } {
            attribute { 'timestamp' } { util:system-dateTime() },
            attribute { 'language' } { $local:language },
            $message
        }
    into
        fn:doc("/db/apps/stanford-nlp/data/log.xml")//logs
};

declare function local:process($path as xs:string) {
    let $log0 := local:log($path)

    let $req := <http:request href="{$path}" method="get"/>

    let $zip := http:send-request($req)[2]
    let $log := local:log(functx:atomic-type($zip))

    return compression:unzip(
            $zip,
            util:function(xs:QName("local:entry-filter"), 3),
            (),
            util:function(xs:QName("local:entry-data"), 4),
            ()
        )
};

(local:log("start"),
local:process($config:corenlp-model-url || $local:language || ".jar"),
local:log("end")
)
