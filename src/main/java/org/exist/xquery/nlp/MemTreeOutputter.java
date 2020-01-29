package org.exist.xquery.nlp;

import edu.stanford.nlp.coref.CorefCoreAnnotations;
import edu.stanford.nlp.coref.data.CorefChain;
import edu.stanford.nlp.ie.machinereading.structure.EntityMention;
import edu.stanford.nlp.ie.machinereading.structure.ExtractionObject;
import edu.stanford.nlp.ie.machinereading.structure.MachineReadingAnnotations;
import edu.stanford.nlp.ie.machinereading.structure.RelationMention;
import edu.stanford.nlp.ie.util.RelationTriple;
import edu.stanford.nlp.ling.CoreAnnotations;
import edu.stanford.nlp.ling.CoreLabel;
import edu.stanford.nlp.ling.IndexedWord;
import edu.stanford.nlp.naturalli.NaturalLogicAnnotations;
import edu.stanford.nlp.neural.rnn.RNNCoreAnnotations;
import edu.stanford.nlp.pipeline.Annotation;
import edu.stanford.nlp.pipeline.AnnotationOutputter;
import edu.stanford.nlp.pipeline.StanfordCoreNLP;
import edu.stanford.nlp.semgraph.SemanticGraph;
import edu.stanford.nlp.semgraph.SemanticGraphCoreAnnotations;
import edu.stanford.nlp.semgraph.SemanticGraphEdge;
import edu.stanford.nlp.sentiment.SentimentCoreAnnotations;
import edu.stanford.nlp.stats.Counters;
import edu.stanford.nlp.time.TimeAnnotations;
import edu.stanford.nlp.time.Timex;
import edu.stanford.nlp.trees.GrammaticalRelation;
import edu.stanford.nlp.trees.Tree;
import edu.stanford.nlp.trees.TreeCoreAnnotations;
import edu.stanford.nlp.trees.TreePrint;
import edu.stanford.nlp.util.CoreMap;
import edu.stanford.nlp.util.Pair;
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

/**
 *
 */
public class MemTreeOutputter extends AnnotationOutputter {

    /**
     *
     * @param annotation
     * @param pipeline
     * @param builder
     * @return
     * @throws QName.IllegalQNameException
     */
    public static Sequence annotationToSequence(
            Annotation annotation,
            StanfordCoreNLP pipeline,
            MemTreeBuilder builder
    ) throws QName.IllegalQNameException {
        Options options = getOptions(pipeline.getProperties());
        return annotationsToSequence(annotation, options, builder);
    }

    /**
     *
     * @param annotation
     * @param options
     * @param builder
     * @return
     * @throws QName.IllegalQNameException
     */
    private static Sequence annotationsToSequence(
            Annotation annotation,
            Options options,
            MemTreeBuilder builder
    ) throws QName.IllegalQNameException {

        builder.startDocument();
        builder.startElement(new QName("StanfordNLP"), null);

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
            for (CoreMap sentence : annotation.get(CoreAnnotations.SentencesAnnotation.class)) {
                attribs = new AttributesImpl();
                attribs.addAttribute(null, "id", "id", "string", Integer.toString(sentCount));
                Integer lineNumber = sentence.get(CoreAnnotations.LineNumberAnnotation.class);
                if (lineNumber != null) {
                    attribs.addAttribute(null, "line", "line", "string", Integer.toString(lineNumber));
                }
                // Adds sentiment as an attribute of this sentence.
                Tree sentimentTree = sentence.get(SentimentCoreAnnotations.SentimentAnnotatedTree.class);
                if (sentimentTree != null) {
                    int sentiment = RNNCoreAnnotations.getPredictedClass(sentimentTree);
                    attribs.addAttribute(null, "sentimentValue", "sentimentValue", "string", Integer.toString(sentiment));
                    String sentimentClass = sentence.get(SentimentCoreAnnotations.SentimentClass.class);
                    attribs.addAttribute(null, "sentiment", "sentiment", "string", sentimentClass.replaceAll(" ", ""));
                }
                sentCount++;
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
                    buildDependencyTreeInfo(builder, "basic-dependencies", sentence.get(SemanticGraphCoreAnnotations.BasicDependenciesAnnotation.class), tokens);
                    buildDependencyTreeInfo(builder, "collapsed-dependencies", sentence.get(SemanticGraphCoreAnnotations.CollapsedDependenciesAnnotation.class), tokens);
                    buildDependencyTreeInfo(builder, "collapsed-ccprocessed-dependencies", sentence.get(SemanticGraphCoreAnnotations.CollapsedCCProcessedDependenciesAnnotation.class), tokens);
                    buildDependencyTreeInfo(builder, "enhanced-dependencies", sentence.get(SemanticGraphCoreAnnotations.EnhancedDependenciesAnnotation.class), tokens);
                    buildDependencyTreeInfo(builder, "enhanced-plus-plus-dependencies", sentence.get(SemanticGraphCoreAnnotations.EnhancedPlusPlusDependenciesAnnotation.class), tokens);
                }

                // add Open IE triples
                Collection<RelationTriple> openieTriples = sentence.get(NaturalLogicAnnotations.RelationTriplesAnnotation.class);
                if (openieTriples != null) {
                    builder.startElement(new QName("openie"), null);
                    addTriples(builder, openieTriples);
                    builder.endElement();
                }

                // add KBP triples
                Collection<RelationTriple> kbpTriples = sentence.get(CoreAnnotations.KBPTriplesAnnotation.class);
                if (kbpTriples != null) {
                    builder.startElement(new QName("kbp"), null);
                    addTriples(builder, kbpTriples);
                    builder.endElement();
                }

                // add the MR entities and relations
                List<EntityMention> entities = sentence.get(MachineReadingAnnotations.EntityMentionsAnnotation.class);
                List<RelationMention> relations = sentence.get(MachineReadingAnnotations.RelationMentionsAnnotation.class);
                if (entities != null && !entities.isEmpty()) {
                    builder.startElement(new QName("MachineReading"), null);
                    builder.startElement(new QName("entities"), null);
                    addEntities(builder, entities);
                    builder.endElement();

                    if (relations != null) {
                        builder.startElement(new QName("relations"), null);
                        addRelations(builder, relations, options.relationsBeam);
                        builder.endElement();
                    }
                    builder.endElement();
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
            addCorefGraphInfo(options, builder, sentences, corefChains);
            builder.endElement(); // coreferences
        }

        builder.endElement(); // StanfordNLP
        builder.endDocument();
        return builder.getDocument();
    }

    /**
     *
     * @param builder
     * @param relations
     * @param beam
     * @throws QName.IllegalQNameException
     */
    private static void addRelations(
            MemTreeBuilder builder,
            List<RelationMention> relations,
            double beam
    ) throws QName.IllegalQNameException {
        for (RelationMention r : relations) {
            if (r.printableObject(beam)) {
                toRelationXML(builder, r);
            }
        }
    }

    /**
     *
     * @param builder
     * @param relation
     * @throws QName.IllegalQNameException
     */
    private static void toRelationXML(
            MemTreeBuilder builder,
            RelationMention relation
    ) throws QName.IllegalQNameException {
        AttributesImpl attributes = null;
        attributes = new AttributesImpl();
        attributes.addAttribute(null, "id", "id", "string", relation.getObjectId());
        builder.startElement(new QName("relation"), attributes);
        builder.startElement(new QName("type"), null);
        builder.characters(relation.getType());
        builder.endElement(); // type

        if (relation.getSubType() != null) {
            builder.startElement(new QName("subtype"), null);
            builder.characters(relation.getSubType());
            builder.endElement(); // subtype
        }

        List<EntityMention> mentions = relation.getEntityMentionArgs();
        builder.startElement(new QName("arguments"), null);
        for (EntityMention entityMention : mentions) {
            toEntityMentionXML(builder, entityMention);
        }
        builder.endElement(); // arguments

        builder.endElement(); // relation
    }

    /**
     *
     * @param builder
     * @param entityMention
     * @throws QName.IllegalQNameException
     */
    private static void toEntityMentionXML(
            MemTreeBuilder builder,
            EntityMention entityMention
    ) throws QName.IllegalQNameException {
        AttributesImpl attributes = null;
        attributes = new AttributesImpl();
        attributes.addAttribute(null, "id", "id", "string", entityMention.getObjectId());
        builder.startElement(new QName("entity"), attributes);

        builder.startElement(new QName("type"), null);
        builder.characters(entityMention.getType());
        builder.endElement(); // type

        setSingleElement(builder, "normalized", entityMention.getNormalizedName());
        setSingleElement(builder, "subtype", entityMention.getSubType());

        attributes = new AttributesImpl();
        attributes.addAttribute(null, "start", "start", "string", Integer.toString(entityMention.getHeadTokenStart()));
        attributes.addAttribute(null, "end", "end", "string", Integer.toString(entityMention.getHeadTokenEnd()));
        builder.startElement(new QName("span"), attributes);
        builder.endElement(); // span

        makeProbabilitiesElement(builder, entityMention);

        builder.endElement(); //entity
    }

    /**
     *
     * @param builder
     * @param object
     * @throws QName.IllegalQNameException
     */
    private static void makeProbabilitiesElement(
            MemTreeBuilder builder,
            ExtractionObject object
    ) throws QName.IllegalQNameException {
        builder.startElement(new QName("probabilities"), null);

        if (object.getTypeProbabilities() != null) {
            List<Pair<String, Double>> sorted = Counters.toDescendingMagnitudeSortedListWithCounts(object.getTypeProbabilities());
            for (Pair<String, Double> lv : sorted) {
                builder.startElement(new QName("probability"), null);

                builder.startElement(new QName("label"), null);
                builder.characters(lv.first);
                builder.endElement(); // label

                builder.startElement(new QName("value"), null);
                builder.characters(lv.second.toString());
                builder.endElement(); // value

                builder.endElement(); // probability
            }

        }
        builder.endElement(); // probabilities
    }

    /**
     *
     * @param builder
     * @param entities
     * @throws QName.IllegalQNameException
     */
    private static void addEntities(
            MemTreeBuilder builder,
            List<EntityMention> entities
    ) throws QName.IllegalQNameException {
        for (EntityMention e : entities) {
            toEntityMentionXML(builder, e);
        }
    }

    /**
     *
     * @param builder
     * @param openieTriples
     * @throws QName.IllegalQNameException
     */
    private static void addTriples(
            MemTreeBuilder builder,
            Collection<RelationTriple> openieTriples
    ) throws QName.IllegalQNameException {
        for (RelationTriple triple : openieTriples) {
            toTripleXML(builder, triple);
        }
    }

    /**
     *
     * @param builder
     * @param triple
     * @throws QName.IllegalQNameException
     */
    private static void toTripleXML(
            MemTreeBuilder builder,
            RelationTriple triple
    ) throws QName.IllegalQNameException {
        AttributesImpl attributes = null;
        builder.startElement(new QName("triple"), null);

        // create the subject
        attributes = new AttributesImpl();
        attributes.addAttribute(null, "begin", "begin", "string", Integer.toString(triple.subjectTokenSpan().first));
        attributes.addAttribute(null, "end", "end", "string", Integer.toString(triple.subjectTokenSpan().second));
        builder.startElement(new QName("subject"), attributes);
        builder.startElement(new QName("text"), null);
        builder.characters(triple.subjectGloss());
        builder.endElement(); //text
        builder.startElement(new QName("lemma"), null);
        builder.characters(triple.subjectLemmaGloss());
        builder.endElement(); //lemma
        builder.endElement(); // subject

        // create the relation
        attributes = new AttributesImpl();
        attributes.addAttribute(null, "begin", "begin", "string", Integer.toString(triple.relationTokenSpan().first));
        attributes.addAttribute(null, "end", "end", "string", Integer.toString(triple.relationTokenSpan().second));
        builder.startElement(new QName("relation"), attributes);
        builder.startElement(new QName("text"), null);
        builder.characters(triple.relationGloss());
        builder.endElement(); //text
        builder.startElement(new QName("lemma"), null);
        builder.characters(triple.relationLemmaGloss());
        builder.endElement(); //lemma
        builder.endElement(); // relation

        // create the object
        attributes = new AttributesImpl();
        attributes.addAttribute(null, "begin", "begin", "string", Integer.toString(triple.objectTokenSpan().first));
        attributes.addAttribute(null, "end", "end", "string", Integer.toString(triple.objectTokenSpan().second));
        builder.startElement(new QName("object"), attributes);
        builder.startElement(new QName("text"), null);
        builder.characters(triple.objectGloss());
        builder.endElement(); //text
        builder.startElement(new QName("lemma"), null);
        builder.characters(triple.objectLemmaGloss());
        builder.endElement(); //lemma
        builder.endElement(); // object

        builder.endElement(); //triple
    }

    /**
     *
     * @param options
     * @param builder
     * @param sentences
     * @param corefChains
     * @return
     * @throws QName.IllegalQNameException
     */
    private static boolean addCorefGraphInfo(
            Options options,
            MemTreeBuilder builder,
            List<CoreMap> sentences,
            Map<Integer, CorefChain> corefChains
    ) throws QName.IllegalQNameException {
        boolean foundCoref = false;

        for (CorefChain chain : corefChains.values()) {
            if (!options.printSingletons && chain.getMentionsInTextualOrder().size() <= 1)
                continue;
            foundCoref = true;
            builder.startElement(new QName("coreference"), null);
            CorefChain.CorefMention source = chain.getRepresentativeMention();
            addCorefMention(options, builder, sentences, source, true);
            for (CorefChain.CorefMention mention : chain.getMentionsInTextualOrder()) {
                if (mention == source) {
                    continue;
                }
                addCorefMention(options, builder, sentences, mention, false);
            }
            builder.endElement(); // coreference
        }
        return foundCoref;
    }

    /**
     *
     * @param options
     * @param builder
     * @param sentences
     * @param mention
     * @param representative
     * @throws QName.IllegalQNameException
     */
    private static void addCorefMention(
            Options options,
            MemTreeBuilder builder,
            List<CoreMap> sentences,
            CorefChain.CorefMention mention,
            boolean representative
    ) throws QName.IllegalQNameException {
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

    /**
     *
     * @param builder
     * @param dependencyType
     * @param graph
     * @param tokens
     * @throws QName.IllegalQNameException
     */
    private static void buildDependencyTreeInfo(
            MemTreeBuilder builder,
            String dependencyType,
            SemanticGraph graph,
            List<CoreLabel> tokens
    ) throws QName.IllegalQNameException {
        if (graph != null) {
            AttributesImpl attributes = null;
            attributes = new AttributesImpl();
            attributes.addAttribute(null, "type", "type", "string", dependencyType);
            builder.startElement(new QName("dependencies"), attributes);

            // The SemanticGraph doesn't explicitly encode the ROOT node,
            // so we print that out ourselves
            for (IndexedWord root : graph.getRoots()) {
                String rel = GrammaticalRelation.ROOT.getLongName();
                rel = rel.replaceAll("\\s+", ""); // future proofing
                int source = 0;
                int target = root.index();
                String sourceWord = "ROOT";
                String targetWord = tokens.get(target - 1).word();
                final boolean isExtra = false;

                addDependencyInfo(builder, rel, isExtra, source, sourceWord, null, target, targetWord, null);
            }

            for (SemanticGraphEdge edge : graph.edgeListSorted()) {
                String rel = edge.getRelation().toString();
                rel = rel.replaceAll("\\s+", "");
                int source = edge.getSource().index();
                int target = edge.getTarget().index();
                String sourceWord = tokens.get(source - 1).word();
                String targetWord = tokens.get(target - 1).word();
                Integer sourceCopy = edge.getSource().copyCount();
                Integer targetCopy = edge.getTarget().copyCount();
                boolean isExtra = edge.isExtra();

                addDependencyInfo(builder, rel, isExtra, source, sourceWord, sourceCopy, target, targetWord, targetCopy);
            }

            builder.endElement(); // dependencies
        }
    }

    /**
     *
     * @param builder
     * @param rel
     * @param isExtra
     * @param source
     * @param sourceWord
     * @param sourceCopy
     * @param target
     * @param targetWord
     * @param targetCopy
     * @throws QName.IllegalQNameException
     */
    private static void addDependencyInfo(
            MemTreeBuilder builder,
            String rel,
            boolean isExtra,
            int source,
            String sourceWord,
            Integer sourceCopy,
            int target,
            String targetWord,
            Integer targetCopy
    ) throws QName.IllegalQNameException {
        AttributesImpl attributes = null;
        attributes = new AttributesImpl();
        attributes.addAttribute(null, "type", "type", "string", rel);
        if (isExtra) {
            attributes.addAttribute(null, "extra", "extra", "string", "true");
        }
        builder.startElement(new QName("dep"), attributes);

        attributes = new AttributesImpl();
        attributes.addAttribute(null, "idx", "idx", "string", Integer.toString(source));
        if (sourceCopy != null && sourceCopy > 0) {
            attributes.addAttribute(null, "copy", "copy", "string", Integer.toString(sourceCopy));
        }
        builder.startElement(new QName("governor"), attributes);
        builder.endElement(); // governor

        attributes = new AttributesImpl();
        attributes.addAttribute(null, "idx", "idx", "string", Integer.toString(target));
        if (targetCopy != null && targetCopy > 0) {
            attributes.addAttribute(null, "copy", "copy", "string", Integer.toString(targetCopy));
        }
        builder.startElement(new QName("dependent"), attributes);
        builder.endElement(); // dependent


        builder.endElement(); // dep
    }

    /**
     *
     * @param builder
     * @param tree
     * @param constituentTreePrinter
     */
    private static void addConstituentTreeInfo(
            MemTreeBuilder builder,
            Tree tree,
            TreePrint constituentTreePrinter
    ) {
        StringWriter treeStrWriter = new StringWriter();
        constituentTreePrinter.printTree(tree, new PrintWriter(treeStrWriter, true));
        String temp = treeStrWriter.toString();
        builder.characters(temp);
    }

    /**
     *
     * @param builder
     * @param token
     * @param id
     * @throws QName.IllegalQNameException
     */
    private static void addWordInfo(
            MemTreeBuilder builder,
            CoreLabel token,
            int id
    ) throws QName.IllegalQNameException {
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

    /**
     *
     * @param builder
     * @param elemName
     * @param value
     * @throws QName.IllegalQNameException
     */
    private static void setSingleElement(
            MemTreeBuilder builder,
            String elemName,
            String value
    ) throws QName.IllegalQNameException {
        if (value != null) {
            builder.startElement(new QName(elemName), null);
            builder.characters(value);
            builder.endElement();
        }
    }

    /**
     *
     * @param doc
     * @param target
     * @param options
     * @throws IOException
     */
    @Override
    public void print(
            Annotation doc,
            OutputStream target,
            Options options
    ) throws IOException {

    }
}
