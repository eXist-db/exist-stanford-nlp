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

(:check available memory:)
declare variable $mem-max := system:get-memory-max();
(: minimum memory requirements :)
declare variable $mem-req := 4000000000;


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

(: Helper function to check the instance's memory. :)
declare function local:check-mem-size($memory as xs:integer) as xs:boolean {
    if ($memory > $mem-req)
    then
        (fn:true())
    else
        (fn:error(fn:QName('https://github.com/lcahlander/exist-stanford-nlp', 'err:memory-low'), 'The  memory is too low'))
};


if (local:check-mem-size($mem-max))
then
    (
    (: store the collection configuration :)
	local:mkcol("/db/system/config", $target),
	xmldb:store-files-from-pattern(concat("/system/config", $target), $dir, "collection.xconf"))
else
    (fn:error(fn:QName('https://github.com/lcahlander/exist-stanford-nlp', 'err:pre-crash'), 'An unknown error occured during pre-install'))
