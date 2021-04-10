xquery version "3.1";

import module namespace ll = "http://exist-db.org/xquery/stanford-nlp/load-language" at "load-language.xqm";


let $paths := (
            "http://nlp.stanford.edu/software/stanford-english-corenlp-2018-10-05-models.jar",
            "http://nlp.stanford.edu/software/stanford-english-kbp-corenlp-2018-10-05-models.jar",
            "http://nlp.stanford.edu/software/stanford-arabic-corenlp-2018-10-05-models.jar",
            "http://nlp.stanford.edu/software/stanford-chinese-corenlp-2018-10-05-models.jar",
            "http://nlp.stanford.edu/software/stanford-french-corenlp-2018-10-05-models.jar",
            "http://nlp.stanford.edu/software/stanford-german-corenlp-2018-10-05-models.jar",
            "http://nlp.stanford.edu/software/stanford-spanish-corenlp-2018-10-05-models.jar",
            ()
        )

for $path in $paths 
return 
  ll:process($path)
