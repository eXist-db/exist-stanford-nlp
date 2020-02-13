/*
 *   exist-stanford-nlp: XQuery module to integrate the stanford named entity
 *   extraction library with eXist-db.
 *   Copyright (C) 2013 Wolfgang Meier and contributors
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.exist.xquery.nlp;

import edu.stanford.nlp.pipeline.Annotation;
import edu.stanford.nlp.pipeline.StanfordCoreNLP;
import org.exist.dom.QName;
import org.exist.dom.memtree.MemTreeBuilder;
import org.exist.xquery.*;
import org.exist.xquery.functions.array.ArrayType;
import org.exist.xquery.functions.map.MapType;
import org.exist.xquery.value.*;

import java.util.Iterator;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Logger;
import java.util.logging.Level;

/**
 *
 */
public class StanfordNLPFunction extends BasicFunction {

    static Logger LOGGER = Logger.getLogger(StanfordNLPFunction.class.getName());

    /**
     *
     */
    public final static FunctionSignature signatures[] = {
            new FunctionSignature(
                    new QName("parse", StanfordNLPModule.NAMESPACE_URI, StanfordNLPModule.PREFIX),
                    "Mark up named entities in a node and all its sub-nodes. Returns a new in-memory document. " +
                            "Recognized entities are enclosed in inline elements.",
                    new SequenceType[] {
                            new FunctionParameterSequenceType("text", Type.STRING, Cardinality.EXACTLY_ONE,
                                    "String of text to analyze."),
                            new FunctionParameterSequenceType("properties", Type.MAP, Cardinality.EXACTLY_ONE,
                                    "A map containing properties for the NLP pipeline. Typically, at least map { \"annotators\": \"tokenize, ssplit\" } should be provided. Properties can also be loaded from a JSON file via json-doc().")
                    },
                    new FunctionReturnSequenceType(Type.DOCUMENT, Cardinality.EXACTLY_ONE,
                            "Sequence of text nodes and elements denoting recognized entities in the text")
            )
    };

    /**
     *
     * @param context
     * @param signature
     */
    public StanfordNLPFunction(XQueryContext context, FunctionSignature signature) {
        super(context, signature);
    }

    /**
     *
     * @param args
     * @param contextSequence
     * @return
     * @throws XPathException
     */
    @Override
    public Sequence eval(Sequence[] args, Sequence contextSequence) throws XPathException {
        final Properties properties;
        properties = new Properties();
        if (getArgumentCount() == 2 && !args[1].isEmpty()) {
            MapType entries = (MapType) args[1].itemAt(0);
            Iterator<Map.Entry<AtomicValue, Sequence>> iterator = entries.iterator();
            while (iterator.hasNext()) {
                Map.Entry<AtomicValue, Sequence> entry = iterator.next();
                String key = String.valueOf(entry.getKey());
                final Sequence entryValue = entry.getValue();
                final Item item = entryValue.itemAt(0);

                StringBuffer buff = new StringBuffer();
                if (item.getType() == Type.ARRAY) {
                    ArrayType array = (ArrayType) item;
                    for (int i = 0; i < array.getSize(); i++) {
                        final Sequence member = array.get(i);
                        if (i > 0) {
                            buff.append(",");
                        }
                        buff.append(member.getStringValue());
                    }
                } else {
                    if ("NULL".equalsIgnoreCase(item.getStringValue())) {

                    } else {
                        buff.append(item.getStringValue());
                    }
                }
                String value = buff.toString();
                LOGGER.log(Level.INFO, "Property: " + key + ": [" + value + "]");
                properties.put(key, value);
            }
        }
        String text = args[0].getStringValue();
        StanfordCoreNLP pipeline = new StanfordCoreNLP(properties);

        final MemTreeBuilder builder = new MemTreeBuilder(context);

        if (builder == null) {
            throw new XPathException("no builder");
        }

        final Annotation annotation = new Annotation(text);
        pipeline.annotate(annotation);

        Sequence result = null;
        try {
            result = MemTreeOutputter.annotationToSequence(annotation, pipeline, builder);
        } catch (QName.IllegalQNameException e) {
            e.printStackTrace();
        }
        return result;
    }

}
