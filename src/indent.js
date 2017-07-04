const { camelCase } = require('./stringOperations')

const tagWithAttributes = /(<\/?)([^ ]*) ?([^/]*)(\/?>)/
const consecutiveRootTags = />\n\s{4}</g
const doubleQuotes = /"/g
const leadingSpaces = /^( *)/
const attributesAndValues = /[^=]*="[^"]*"/g

const indentLine = indentLevel => str => ' '.repeat(indentLevel) + str
const getStyleAttribute = str => {
  const props = str.substring('style="'.length, str.length - 1).split(';')
  return [
    'style={{',
    ...props.map(prop => {
      const [key, val] = prop.split(':')
      return indentLine(2)(`${camelCase(key)}: '${val}',`)
    }),
    '}}'
  ]
}

module.exports = svg => svg
  .split('\n')
  .reduce((buffer, line) => {
    const matches = line.match(tagWithAttributes)
    if (!matches) { return buffer }
    const closingTag = matches[1] === '</'
    const tag = matches[2]
    const attrsStr = matches[3]
    const autoclosingTag = matches[4] === '/>'
    const indentLevel = line.match(leadingSpaces)[1].length
    const indentParentLine = indentLine(indentLevel + 2)
    const indentChildLine = indentLine(indentLevel + 2 + 2)
    const attributes = attrsStr.match(attributesAndValues) || []
      .map(str => {
        const [key, val] = str
          .trim()
          .replace(doubleQuotes, '\'')
          .split('=')
        if (key === 'class') { return null }
        if (key === 'style') {
          return getStyleAttribute(str)
            .map(indentChildLine)
            .join('\n')
        }
        return indentChildLine(`${camelCase(key)}=${val}`)
      })
      .filter(line => line)
      .join('\n')

    if (tag === 'svg') { return buffer }

    return buffer.concat((closingTag
      ? ([indentParentLine(`</${tag}>`)])
      : ([
        indentParentLine(`<${tag}`),
        attributes,
        !closingTag && tag === 'svg' ? indentChildLine('{...props}') : null,
        indentParentLine(autoclosingTag ? '/>' : '>')
      ]))
      .filter(line => line)
      .join('\n'))
  }, [])
  .join('\n')
  .trim()
  .replace(consecutiveRootTags, '>,\n    <')