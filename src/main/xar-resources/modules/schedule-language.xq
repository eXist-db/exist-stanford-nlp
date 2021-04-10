xquery version "3.1";

import module namespace scheduler = "http://exist-db.org/xquery/scheduler";
import module namespace config = "http://exist-db.org/apps/stanford-nlp/config";

let $param := <parameters><param name="path" value="{$config:corenlp-model-url || 'chinese.jar'}"/></parameters>

return scheduler:schedule-xquery-periodic-job("/db/apps/stanford-nlp/module/schedule-load.xq", 500, "load chinese", $param, 500, 0)