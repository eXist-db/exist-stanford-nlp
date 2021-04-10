xquery version "3.1";

import module namespace ll = "http://exist-db.org/xquery/stanford-nlp/load-language" at "load-language.xqm";
import module namespace config = "http://exist-db.org/apps/stanford-nlp/config";


let $paths := (
            $config:corenlp-model-url || "arabic.jar",
            $config:corenlp-model-url || "chinese.jar",
            $config:corenlp-model-url || "english.jar",
            $config:corenlp-model-url || "english-kbp.jar",
            $config:corenlp-model-url || "french.jar",
            $config:corenlp-model-url || "german.jar",
            $config:corenlp-model-url || "spanish.jar",
            ()
        )

for $path in $paths 
return 
  ll:process($path)
