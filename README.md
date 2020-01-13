# Example App for eXist-db

This is a simple skeleton Example App for eXist-db which will be built as an EXPath Package using Maven.

You can use this as a base for your own eXist-db Apps or Libraries.


The App contains:
 
1. An example XQuery Library Module of user defined functions written in Java.

2. A example XQuery Library Module of user defined functions written in XQuery.

3. A simple Web landing page for the app itself.   



1. By default the project is setup for an LGPL 2.1 licensing scheme. You should decide if that is appropriate and if not, make the following modifications:

  1. Modify the `licenses` section in `pom.xml`.
  
  2. Override the `configuration` of the license-maven-plugin` in `pom.xml`. See: http://code.mycila.com/license-maven-plugin/
  
  3. Potentially remove or replace `LGPL2.1-template.txt`.
  
  4. Run `mvn license:check` and `mvn license:format` appropriately. 

1. You should modify the `pom.xml` changing at least the `groupId` and `artifactId` to coordinates that are suitable for your organisation.

2. You should modify, remove, or append to, the files in:

  * `src/main/java` for any XQuery library modules written in Java.

  * `src/main/xquery` for any XQUery library modules written in Java.

  * `src/main/xar-resources` for any static files or XQuery modules that are shipped as part of your app. 

NOTE: You will also need to modify `xar-assembly.xml` to reflect any changes you make to user defined XQuery library modules (whether written in Java or XQuery).


* Requirements: Java 8, Apache Maven 3.3+, Git.

If you want to create an EXPath Package for the app, you can run:

```bash
$ mvn package
```

There will be a `.xar` file in the `target/` sub-folder.


You can use the Maven Release plugin to publish your applications **publicly** to Maven Central.

1. You need to register to manage the `groupId` of your organisation on Maven Central, see: http://central.sonatype.org/pages/ossrh-guide.html#create-a-ticket-with-sonatype

2. Assuming your Git repo is in-sync, you can simply run the following to upload to Sonatype OSS:

```bash
$ mvn release:prepare
$ mvn release:perform
```

3. You need to release the artifacts on the Sonatype OSS web portal, see: http://central.sonatype.org/pages/ossrh-guide.html#releasing-to-central
