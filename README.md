---
author: 'Loren Cahlander North Carolina Unites States of America
  <loren.cahlander@easymetahub.com>'
title: 'Stanford CoreNLP Wrapper for eXist-db'
---

Introduction
============

This application is a wrapper around the Stanford CoreNLP pipeline. for
eXist-db (the Open Source Native XML Database)

Why
---

Loren was between projects and at an eXist-db weekly conference call it
came to light that the previous impementations of Stanford NLP and Named
Entity Recognition were not compatible with version 5.0 of eXist-db.
Loren took this project on while looking for the next project, so please
see the contributions section at the end of this article.

Getting Started
===============

Install eXist-db
----------------

Installing the Application
--------------------------

Loading the Languages
---------------------

The application is installed without any of the language files OOTB. The
files need to be loaded after the installation, so there is an XQuery
script that will load a language specific JAR file from an external
webiste. The JAR file is expanded and the files are store in a relative
path in the database from the data collection within the application.

### Properties

The properties files within the JAR file are transformed to JSON
documents where the entries pointing to the data files that have been
loaded into the database are transformed to the URL to that resource.

#### Defaults

The pipeline uses default properties that assume that the english jar
file is loaded in the classpath. Since the english jar is loaded into
the database it is important to have a defaults JSON document that
points to the english files in the database.

User Interface
==============

Named Entity Recognition
------------------------

This user interface allows the user to enter text in the textbox, select
the language and then after it is submitted the resulting NER has a
color coded view of the text that identities the named entities.

NLP
---

API
===

RESTful API
-----------

### Natural Language Processing

### Named Entity Recognition

XQuery Function Modules
-----------------------

### Natural Language Processing

```xquery
xquery version "3.1";

import module namespace nlp="http://exist-db.org/xquery/stanford-nlp";

let $text := "The fate of Lehman Brothers, the beleaguered investment bank, " ||
             "hung in the balance on Sunday as Federal Reserve officials and " ||
             "the leaders of major financial institutions continued to gather in " ||
             "emergency meetings trying to complete a plan to rescue the stricken " ||
             "bank.  Several possible plans emerged from the talks, held at the " ||
             "Federal Reserve Bank of New York and led by Timothy R. Geithner, " ||
             "the president of the New York Fed, and Treasury Secretary Henry M. Paulson Jr."

let $properties := map { 
                     "annotators" : "tokenize, ssplit, pos, lemma, ner, depparse, coref",
                     "tokenize.language" : "en" 
                   }

return nlp:parse($text, $properties)
```

This returns an XML document of the parsed text.

### Named Entity Recognition

```xquery
    xquery version "3.1";

    import module namespace ner = "http://exist-db.org/xquery/stanford-nlp/ner";

    let $base := <p>The fate of Lehman Brothers, the beleaguered investment bank, 
                    hung in the balance on Sunday as Federal Reserve officials and
                    the leaders of major financial institutions continued to gather 
                    in emergency meetings trying to complete a plan to rescue the 
                    stricken bank.  Several possible plans emerged from the talks, 
                    held at the Federal Reserve Bank of New York and led by 
                    Timothy R. Geithner, the president of the New York Fed, and 
                    Treasury Secretary Henry M. Paulson Jr.</p> 

    return ner:classify-node($base)
```

With the results

``` xml
<p>The fate of <ORGANIZATION>Lehman Brothers</ORGANIZATION>, the beleaguered investment bank, 
hung in the balance on <DATE>Sunday</DATE> as <ORGANIZATION>Federal Reserve</ORGANIZATION> 
officials and the leaders of major financial institutions continued to gather in emergency 
meetings trying to complete a plan to rescue the stricken bank.  Several possible plans 
emerged from the talks, held at the <ORGANIZATION>Federal Reserve Bank of New York</ORGANIZATION> 
and led by <PERSON>Timothy R. Geithner</PERSON>, the <TITLE>president</TITLE> of the 
<ORGANIZATION>New York Fed</ORGANIZATION>, and <TITLE>Treasury Secretary</TITLE> 
<PERSON>Henry M. Paulson Jr</PERSON>.</p>
```

Future Developments
===================

Any requests for features should be submitted to
<https://github.com/lcahlander/exist-stanford-nlp/issues>

About the Author
================

Contributions
-------------

Loren is an independent contractor, so his contributions to the Open
Source community are on his own time. If you appreciate his
contributions to the NoSQL and the Natural Language Processing
communities, then please either contract him for a project or submit a
contribution to his company PayPal at <loren.cahlander@easymetahub.com>.
