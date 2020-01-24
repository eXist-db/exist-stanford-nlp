package org.exist.xquery.ner;

import edu.stanford.nlp.coref.CorefCoreAnnotations;
import edu.stanford.nlp.coref.data.CorefChain;
import edu.stanford.nlp.ie.machinereading.structure.EntityMention;
import edu.stanford.nlp.ie.machinereading.structure.MachineReadingAnnotations;
import edu.stanford.nlp.ie.machinereading.structure.RelationMention;
import edu.stanford.nlp.ie.util.RelationTriple;
import edu.stanford.nlp.ling.CoreAnnotations;
import edu.stanford.nlp.ling.CoreLabel;
import edu.stanford.nlp.naturalli.NaturalLogicAnnotations;
import edu.stanford.nlp.pipeline.Annotation;
import edu.stanford.nlp.pipeline.AnnotationOutputter;
import edu.stanford.nlp.pipeline.CoreNLPProtos;
import edu.stanford.nlp.pipeline.StanfordCoreNLP;
import edu.stanford.nlp.semgraph.SemanticGraph;
import edu.stanford.nlp.semgraph.SemanticGraphCoreAnnotations;
import edu.stanford.nlp.sentiment.SentimentCoreAnnotations;
import edu.stanford.nlp.time.TimeAnnotations;
import edu.stanford.nlp.time.Timex;
import edu.stanford.nlp.trees.Tree;
import edu.stanford.nlp.trees.TreeCoreAnnotations;
import edu.stanford.nlp.trees.TreePrint;
import edu.stanford.nlp.util.CoreMap;
import edu.stanford.nlp.util.StringUtils;
import org.exist.dom.QName;
import org.exist.dom.memtree.MemTreeBuilder;
import org.exist.xquery.value.Sequence;
import org.xml.sax.helpers.AttributesImpl;

import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Collection;
import java.util.List;
import java.util.Map;

public class MemTreeOutputter extends AnnotationOutputter {
    private static final String NAMESPACE_URI = null;

    @Override
    public void print(Annotation doc, OutputStream target, Options options) throws IOException {

    }

    public static Sequence annotationToSequence(Annotation annotation, StanfordCoreNLP pipeline, MemTreeBuilder builder) throws QName.IllegalQNameException {
        Options options = getOptions(pipeline.getProperties());
        return annotationsToSequence(annotation, options, builder);
    }

    private static Sequence annotationsToSequence(Annotation annotation, Options options, MemTreeBuilder builder) throws QName.IllegalQNameException {

        builder.startDocument();
        builder.startElement(new QName("root"), null);
        builder.startElement(new QName("document"), null);

        setSingleElement(builder, "docId", annotation.get(CoreAnnotations.DocIDAnnotation.class));
        setSingleElement(builder, "docDate", annotation.get(CoreAnnotations.DocDateAnnotation.class));
        setSingleElement(builder, "docSourceType", annotation.get(CoreAnnotations.DocSourceTypeAnnotation.class));
        setSingleElement(builder, "docType", annotation.get(CoreAnnotations.DocTypeAnnotation.class));
        setSingleElement(builder, "author", annotation.get(CoreAnnotations.AuthorAnnotation.class));
        setSingleElement(builder, "location", annotation.get(CoreAnnotations.LocationAnnotation.class));

        if (options.includeText) {
            setSingleElement(builder, "text", annotation.get(CoreAnnotations.TextAnnotation.class));
        }
        AttributesImpl attribs = null;

        //
        // Save the information for each sentence in this doc
        //
        builder.startElement(new QName("sentences"), null);

        if (annotation.get(CoreAnnotations.SentencesAnnotation.class) != null) {
            int sentCount = 1;
            for (CoreMap sentence: annotation.get(CoreAnnotations.SentencesAnnotation.class)) {
                attribs = new AttributesImpl();
                attribs.addAttribute(null, "id", "id", "string", Integer.toString(sentCount));
                Integer lineNumber = sentence.get(CoreAnnotations.LineNumberAnnotation.class);
                if (lineNumber != null) {
                    attribs.addAttribute(null, "line", "line", "string", Integer.toString(lineNumber));
                }
                sentCount ++;
                builder.startElement(new QName("sentence"), attribs);

                builder.startElement(new QName("tokens"), null);

                List<CoreLabel> tokens = sentence.get(CoreAnnotations.TokensAnnotation.class);
                for (int j = 0; j < tokens.size(); j++) {
                    attribs = new AttributesImpl();
                    attribs.addAttribute(null, "id", "id", "string", Integer.toString(j + 1));
                    builder.startElement(new QName("token"), attribs);
                    addWordInfo(builder, tokens.get(j), j + 1);
                    builder.endElement();
                }
                builder.endElement(); // tokens

                // add tree info
                Tree tree = sentence.get(TreeCoreAnnotations.TreeAnnotation.class);

                if (tree != null) {
                    builder.startElement(new QName("parse"), null);
                    addConstituentTreeInfo(builder, tree, options.constituencyTreePrinter);
                    builder.endElement();
                }
                SemanticGraph basicDependencies = sentence.get(SemanticGraphCoreAnnotations.BasicDependenciesAnnotation.class);

                if (basicDependencies != null) {
                    buildDependencyTreeInfo(builder, "basic-dependencies", sentence.get(SemanticGraphCoreAnnotations.BasicDependenciesAnnotation.class), tokens, NAMESPACE_URI);
                    buildDependencyTreeInfo(builder, "collapsed-dependencies", sentence.get(SemanticGraphCoreAnnotations.CollapsedDependenciesAnnotation.class), tokens, NAMESPACE_URI);
                    buildDependencyTreeInfo(builder, "collapsed-ccprocessed-dependencies", sentence.get(SemanticGraphCoreAnnotations.CollapsedCCProcessedDependenciesAnnotation.class), tokens, NAMESPACE_URI);
                    buildDependencyTreeInfo(builder, "enhanced-dependencies", sentence.get(SemanticGraphCoreAnnotations.EnhancedDependenciesAnnotation.class), tokens, NAMESPACE_URI);
                    buildDependencyTreeInfo(builder, "enhanced-plus-plus-dependencies", sentence.get(SemanticGraphCoreAnnotations.EnhancedPlusPlusDependenciesAnnotation.class), tokens, NAMESPACE_URI);
                }

                // add Open IE triples
                Collection<RelationTriple> openieTriples = sentence.get(NaturalLogicAnnotations.RelationTriplesAnnotation.class);
                if (openieTriples != null) {

                }

                // add KBP triples
                Collection<RelationTriple> kbpTriples = sentence.get(CoreAnnotations.KBPTriplesAnnotation.class);
                if (kbpTriples != null) {

                }

                // add the MR entities and relations
                List<EntityMention> entities = sentence.get(MachineReadingAnnotations.EntityMentionsAnnotation.class);
                List<RelationMention> relations = sentence.get(MachineReadingAnnotations.RelationMentionsAnnotation.class);
                if (entities != null && ! entities.isEmpty()) {

                }

                // Adds sentiment as an attribute of this sentence.
                Tree sentimentTree = sentence.get(SentimentCoreAnnotations.SentimentAnnotatedTree.class);
                if (sentimentTree != null) {

                }

                builder.endElement(); // sentence
            }
        }

        builder.endElement(); // sentences

        //
        // add the coref graph
        //
        Map<Integer, CorefChain> corefChains =
                annotation.get(CorefCoreAnnotations.CorefChainAnnotation.class);
        if (corefChains != null) {
            List<CoreMap> sentences = annotation.get(CoreAnnotations.SentencesAnnotation.class);
            builder.startElement(new QName("coreferences"), null);
            addCorefGraphInfo(options, builder, sentences, corefChains, NAMESPACE_URI);
            builder.endElement(); // coreferences
        }

        builder.endElement(); // doocument
        builder.endElement(); // root
        builder.endDocument();
        return builder.getDocument();
    }

    private static boolean addCorefGraphInfo(Options options, MemTreeBuilder builder, List<CoreMap> sentences, Map<Integer, CorefChain> corefChains, String namespaceUri) throws QName.IllegalQNameException {
        boolean foundCoref = false;

        for (CorefChain chain : corefChains.values()) {
            if (!options.printSingletons && chain.getMentionsInTextualOrder().size() <= 1)
                continue;
            foundCoref = true;
            builder.startElement(new QName("coreference"), null);
            CorefChain.CorefMention source = chain.getRepresentativeMention();
            addCorefMention(options, builder, namespaceUri, sentences, source, true);
            for (CorefChain.CorefMention mention : chain.getMentionsInTextualOrder()) {
                if (mention == source) {
                    continue;
                }
                addCorefMention(options, builder, namespaceUri, sentences, mention, false);
            }
            builder.endElement(); // coreference
        }
        return foundCoref;
    }

    private static void addCorefMention(Options options, MemTreeBuilder builder, String namespaceUri, List<CoreMap> sentences, CorefChain.CorefMention mention, boolean representative) throws QName.IllegalQNameException {
        AttributesImpl attributes = null;
        if (representative) {
            attributes = new AttributesImpl();
            attributes.addAttribute(null, "representative", "representative", "string", "true");
        }
        builder.startElement(new QName("mention"), attributes);

        setSingleElement(builder, "sentence", Integer.toString(mention.sentNum));
        setSingleElement(builder, "start", Integer.toString(mention.startIndex));
        setSingleElement(builder, "end", Integer.toString(mention.endIndex));
        setSingleElement(builder, "head", Integer.toString(mention.headIndex));

        String text = mention.mentionSpan;
        setSingleElement(builder, "text", text);

        // Do you want context with your coreference?
        if (sentences != null && options.coreferenceContextSize > 0) {
            // If so use sentences to get so context from sentences

            List<CoreLabel> tokens = sentences.get(mention.sentNum - 1).get(CoreAnnotations.TokensAnnotation.class);
            int contextStart = Math.max(mention.startIndex - 1 - 5, 0);
            int contextEnd = Math.min(mention.endIndex - 1 + 5, tokens.size());
            String leftContext = StringUtils.joinWords(tokens, " ", contextStart, mention.startIndex - 1);
            String rightContext = StringUtils.joinWords(tokens, " ", mention.endIndex - 1, contextEnd);

            setSingleElement(builder, "leftContext", leftContext);
            setSingleElement(builder, "rightContext", rightContext);
        }
        builder.endElement(); // mention
    }

    private static void buildDependencyTreeInfo(MemTreeBuilder builder, String dependencyType, SemanticGraph graph, List<CoreLabel> tokens, String namespaceUri) {
        if (graph != null) {

        }
    }

    private static void addConstituentTreeInfo(MemTreeBuilder builder, Tree tree, TreePrint constituentTreePrinter) {
        StringWriter treeStrWriter = new StringWriter();
        constituentTreePrinter.printTree(tree, new PrintWriter(treeStrWriter, true));
        String temp = treeStrWriter.toString();
        builder.characters(temp);
    }

    private static void addWordInfo(MemTreeBuilder builder, CoreLabel token, int id) throws QName.IllegalQNameException {
        setSingleElement(builder, "word", token.get(CoreAnnotations.TextAnnotation.class));
        setSingleElement(builder, "lemma", token.get(CoreAnnotations.LemmaAnnotation.class));

        if (token.containsKey(CoreAnnotations.CharacterOffsetBeginAnnotation.class) && token.containsKey(CoreAnnotations.CharacterOffsetEndAnnotation.class)) {
            setSingleElement(builder, "CharacterOffsetBegin", Integer.toString(token.get(CoreAnnotations.CharacterOffsetBeginAnnotation.class)));
            setSingleElement(builder, "CharacterOffsetEnd", Integer.toString(token.get(CoreAnnotations.CharacterOffsetEndAnnotation.class)));
        }

        if (token.containsKey(CoreAnnotations.PartOfSpeechAnnotation.class)) {
            setSingleElement(builder, "POS", token.get(CoreAnnotations.PartOfSpeechAnnotation.class));
        }

        if (token.containsKey(CoreAnnotations.NamedEntityTagAnnotation.class)) {
            setSingleElement(builder, "NER", token.get(CoreAnnotations.NamedEntityTagAnnotation.class));
        }

        if (token.containsKey(CoreAnnotations.NormalizedNamedEntityTagAnnotation.class)) {
            setSingleElement(builder, "NormalizedNER", token.get(CoreAnnotations.NormalizedNamedEntityTagAnnotation.class));
        }

        if (token.containsKey(CoreAnnotations.SpeakerAnnotation.class)) {
            setSingleElement(builder, "Speaker", token.get(CoreAnnotations.SpeakerAnnotation.class));
        }

        if (token.containsKey(TimeAnnotations.TimexAnnotation.class)) {
            Timex timex = token.get(TimeAnnotations.TimexAnnotation.class);
            AttributesImpl attribs = new AttributesImpl();
            attribs.addAttribute(null, "tid", "tid", "string", timex.tid());
            attribs.addAttribute(null, "type", "type", "string", timex.timexType());
            builder.startElement(new QName("Timex"), attribs);
            builder.endElement();
        }

        if (token.containsKey(CoreAnnotations.TrueCaseAnnotation.class)) {
            setSingleElement(builder, "TrueCase", token.get(CoreAnnotations.TrueCaseAnnotation.class));
        }

        if (token.containsKey(CoreAnnotations.TrueCaseTextAnnotation.class)) {
            setSingleElement(builder, "TrueCase", token.get(CoreAnnotations.TrueCaseTextAnnotation.class));
        }

        if (token.containsKey(SentimentCoreAnnotations.SentimentClass.class)) {
            setSingleElement(builder, "sentiment", token.get(SentimentCoreAnnotations.SentimentClass.class));
        }

        if (token.containsKey(CoreAnnotations.WikipediaEntityAnnotation.class)) {
            setSingleElement(builder, "entitylink", token.get(CoreAnnotations.WikipediaEntityAnnotation.class));
        }
    }

    private static void setSingleElement(MemTreeBuilder builder, String elemName, String value) throws QName.IllegalQNameException {
        if (value != null) {
            builder.startElement(new QName(elemName), null);
            builder.characters(value);
            builder.endElement();
        }
    }
}
