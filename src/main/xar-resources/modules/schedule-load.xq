xquery version "3.1";

import module namespace ll = "http://exist-db.org/xquery/stanford-nlp/load-language" at "load-language.xqm";

declare variable $local:path external := "http://nlp.stanford.edu/software/stanford-english-corenlp-2018-10-05-models.jar";

ll:process($local:path)
