xquery version "3.1";

import module namespace xmldb = "http://exist-db.org/xquery/xmldb";

(:~
 : This script will be executed before your application
 : is copied into the database.
 :
 : You can perform any additional initialisation that you
 : need in here. By default it just installs your
 : collection.xconf.
 :
 : The following external variables are set by the repo:deploy function
 :)

(: file path pointing to the exist installation directory :)
declare variable $home external;

(: path to the directory containing the unpacked .xar package :)
declare variable $dir external;

(: the target collection into which the app is deployed :)
declare variable $target external;


declare function local:mkcol-recursive($collection, $components) {
    if (exists($components)) then
        let $newColl := concat($collection, "/", $components[1])
        return (
            xmldb:create-collection($collection, $components[1]),
            local:mkcol-recursive($newColl, subsequence($components, 2))
        )
    else
        ()
};

(: Helper function to recursively create a collection hierarchy. :)
declare function local:mkcol($collection, $path) {
    local:mkcol-recursive($collection, tokenize($path, "/"))
};

(: store the collection configuration :)
local:mkcol("/db/system/config", $target),
local:mkcol(concat("/system/config", $target), "data"),
xmldb:store-files-from-pattern(concat("/system/config", $target, "/data"), $dir, "collection.xconf")