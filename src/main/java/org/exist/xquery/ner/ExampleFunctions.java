package org.exist.xquery.ner;

import org.exist.dom.QName;
import org.exist.dom.memtree.DocumentImpl;
import org.exist.dom.memtree.MemTreeBuilder;
import org.exist.xquery.BasicFunction;
import org.exist.xquery.FunctionSignature;
import org.exist.xquery.XPathException;
import org.exist.xquery.XQueryContext;
import org.exist.xquery.value.IntegerValue;
import org.exist.xquery.value.Sequence;
import org.exist.xquery.value.StringValue;
import org.exist.xquery.value.Type;

import java.util.Optional;

import static org.exist.xquery.FunctionDSL.*;
import static org.exist.xquery.ner.ExampleModule.functionSignature;

/**
 * Some very simple XQuery example functions implemented
 * in Java.
 */
public class ExampleFunctions extends BasicFunction {

    private static final String FS_HELLO_WORLD_NAME = "hello-world";
    static final FunctionSignature FS_HELLO_WORLD = functionSignature(
        FS_HELLO_WORLD_NAME,
        "An example function that returns <hello>world</hello>.",
        returns(Type.DOCUMENT),
        null
    );

    private static final String FS_SAY_HELLO_NAME = "say-hello";
    static final FunctionSignature FS_SAY_HELLO = functionSignature(
            FS_SAY_HELLO_NAME,
            "An example function that returns <hello>{$name}</hello>.",
            returns(Type.DOCUMENT),
            optParam("name", Type.STRING, "A name")
    );

    private static final String FS_ADD_NAME = "add";
    static final FunctionSignature FS_ADD = functionSignature(
            FS_ADD_NAME,
            "An example function that adds two numbers together.",
            returns(Type.INT),
            param("a", Type.INT, "A number"),
            param("b", Type.INT, "A number")
    );

    public ExampleFunctions(final XQueryContext context, final FunctionSignature signature) {
        super(context, signature);
    }

    @Override
    public Sequence eval(final Sequence[] args, final Sequence contextSequence) throws XPathException {
        switch (getName().getLocalPart()) {

            case FS_HELLO_WORLD_NAME:
                return sayHello(Optional.of(new StringValue("World")));

            case FS_SAY_HELLO_NAME:
                final Optional<StringValue> name = args[0].isEmpty() ? Optional.empty() : Optional.of((StringValue)args[0].itemAt(0));
                return sayHello(name);

            case FS_ADD_NAME:
                final IntegerValue a = (IntegerValue) args[0].itemAt(0);
                final IntegerValue b = (IntegerValue) args[1].itemAt(0);
                return add(a, b);

            default:
                throw new XPathException(this, "No function: " + getName() + "#" + getSignature().getArgumentCount());
        }
    }

    /**
     * Creates an XML document like <hello>name</hello>.
     *
     * @param name An optional name, if empty then "stranger" is used.
     *
     * @return An XML document
     */
    private DocumentImpl sayHello(final Optional<StringValue> name) throws XPathException {
        try {
            final MemTreeBuilder builder = new MemTreeBuilder(context);
            builder.startDocument();
            builder.startElement(new QName("hello"), null);
            builder.characters(name.map(StringValue::toString).orElse("stranger"));
            builder.endElement();
            builder.endDocument();

            return builder.getDocument();
        } catch (final QName.IllegalQNameException e) {
            throw new XPathException(this, e.getMessage(), e);
        }
    }

    /**
     * Adds two numbers together.
     *
     * @param a The first number
     * @param b The second number
     *
     * @return The result;
     */
    private IntegerValue add(final IntegerValue a, final IntegerValue b) throws XPathException {
        final int result = a.getInt() + b.getInt();
        return new IntegerValue(result);
    }
}
