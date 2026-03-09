import { GraphQLScalarType, Kind, type ValueNode } from 'graphql';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function parseJsonLiteral(ast: ValueNode): JsonValue {
  switch (ast.kind) {
    case Kind.STRING:
      return ast.value;
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
      return parseInt(ast.value, 10);
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT: {
      const result: Record<string, JsonValue> = {};
      for (const field of ast.fields) {
        result[field.name.value] = parseJsonLiteral(field.value);
      }
      return result;
    }
    case Kind.LIST:
      return ast.values.map((value) => parseJsonLiteral(value));
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

export const GraphQLJSON: GraphQLScalarType<JsonValue, JsonValue> = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value): JsonValue {
    return value as JsonValue;
  },
  parseValue(value): JsonValue {
    return value as JsonValue;
  },
  parseLiteral(ast): JsonValue {
    return parseJsonLiteral(ast);
  },
});
