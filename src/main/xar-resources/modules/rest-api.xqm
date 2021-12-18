xquery version "3.1";

module namespace api = "http://exist-db.org/xquery/stanford-nlp/api";
import module namespace scheduler = "http://exist-db.org/xquery/scheduler";
import module namespace map = "http://www.w3.org/2005/xpath-functions/map";

declare namespace rest = "http://exquery.org/ns/restxq";
declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";


declare function api:schedule-language($language as xs:string*) as map(*)
{
    let $a :=
    scheduler:schedule-xquery-periodic-job(
        "/db/apps/stanford-nlp/modules/load.xq",
        500,
        "nlp-load-" || $language || "-" || util:uuid(),
        <parameters>
            <param name="language" value="{$language}" />
        </parameters>,
        1000,
        0
    )
    return
        map {
            "language": $language,
            "status": $a
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
function api:load-language(
$language as xs:string*
) as map(*)
{
    switch ($language)
    case "arabic"
        return api:schedule-language($language)

    case "chinese"
        return api:schedule-language($language)

    case "english"
        return api:schedule-language($language)

    case "english-kbp"
        return api:schedule-language($language)

    case "french"
        return api:schedule-language($language)

    case "german"
        return api:schedule-language($language)

    case "spanish"
        return api:schedule-language($language)

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
%rest:produces("application/json")
%output:media-type("application/json")
%output:method("json")
function api:logs(
) as array(*)
{
    array {
        for $log in fn:doc("/db/apps/stanford-nlp/data/log.xml")//logs/log
        let $timestamp := xs:string($log/@timestamp)
        let $language := xs:string($log/@language)
        let $text := $log/text()
        order by $timestamp ascending
        return
            map {
                'timestamp': $timestamp,
                'language': $language,
                'message': $text
            }
    }
};
