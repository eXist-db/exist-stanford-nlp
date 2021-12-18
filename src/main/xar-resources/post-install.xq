xquery version "3.1";

import module namespace xmldb = "http://exist-db.org/xquery/xmldb";

(:~
 : This script will be executed after your application
 : is copied into the database.
 :
 : You can perform any final cleanup that you
 : need in here. By default it just removes the copy
 : of collection.xconf from the app collection.
 :
 : The following external variables are set by the repo:deploy function
 :)

(: file path pointing to the exist installation directory :)
declare variable $home external;

(: path to the directory containing the unpacked .xar package :)
declare variable $dir external;

(: the target collection into which the app is deployed :)
declare variable $target external;

let $modules :=    (
"load.xq",
()
)

let $a := (
    for $module in $modules
    return
        (
            sm:chown(xs:anyURI($target || "/modules/" || $module), "nlp:nlp"),
            sm:chmod(xs:anyURI($target || "/modules/" || $module), "r-sr-xr-x"),
            ()
        ),
    sm:chown(xs:anyURI($target || "/modules/rest-api.xqm"), "admin:dba"),
    sm:chmod(xs:anyURI($target || "/modules/rest-api.xqm"), "r-sr-xr-x"),
    ()
)

(:
  collection configuration was copied to the system config collection by pre-install.xq
  so we can now remove it from the app colllection
:)
return
xmldb:remove($target, "collection.xconf")
