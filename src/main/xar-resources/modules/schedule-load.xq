xquery version "3.1";

import module namespace ll = "http://exist-db.org/xquery/stanford-nlp/load-language" at "load-language.xqm";
import module namespace config = "http://exist-db.org/apps/stanford-nlp/config";

declare variable $local:path external := $config:corenlp-model-url || 'english.jar';

ll:process($local:path)
