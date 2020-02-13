xquery version "3.1";

import module namespace scheduler = "http://exist-db.org/xquery/scheduler";

let $param := <parameters><param name="path" value="http://nlp.stanford.edu/software/stanford-chinese-corenlp-2018-10-05-models.jar"/></parameters>

return scheduler:schedule-xquery-periodic-job("/db/apps/stanford-nlp/module/schedule-load.xq", 500, "load chinese", $param, 500, 0)