#!/usr/bin/env node

// v1.1.0 - Dec 14th, 2018

// Disclaimer: This doesn't create the CLI docs without fault,
//             it's simply to get most of the work done.
//             You will still need to read and check the resulting docs.

const { execFile } = require('child_process')
const { resolve } = require('path')
const program = require('yargs')
const pify = require('pify')
const fs = require('fs')

const { argv } = program
  .command('$0 [options]', 'Builds documentation for `yargs` CLI', () => {
    program
      .positional('commandPath', {
        type: 'string',
        describe: 'Relative path to your commands',
        default: resolve(process.cwd(), 'bin')
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        describe: 'Relative path for READMEs',
        default: resolve(process.cwd(), 'docs')
      })
      .option('name', {
        alias: 'n',
        type: 'string',
        describe: 'Base name of the READMEs',
        default: 'CLI-README.md'
      })
      .help('h')
  })

module.exports = (async function main() {
  let parentCommand
  const commandDescriptions = {}
  const TYPES = [ 'string', 'boolean', 'number' ]
  // Utility functions
  const splitOnPseudoTab = text => text.split(/\s{2,}/)
  const removePseudoTab = text => text.replace(/\s{2,}/, ' ')
  const formatIntoTable = columns => `|${columns.join('|')}|`
  const removeTabs = text => text.replace(/[ \t]{3,}/gm, '')
  const isType = text => TYPES.includes(text)

  /**
   * Given a set of strings and arrays, find the instance that contains the given text
   * @param  {Array}  searchDomain    Array of instances,
   *                                    can be strings or arrays of strings
   * @param  {String}  matchingText   String to match
   * @return {String}
   */
  const findMatching = ({ searchDomain, matchingText }) =>
    searchDomain.map((obj) => {
      if (undefined === obj) {
        return null
      } else if ('string' === typeof obj) {
        if (obj.includes(matchingText)) {
          return obj
        }
        return null
      } else if (Array.isArray(obj)) {
        return obj.filter(child =>
          Boolean(findMatching({
            searchDomain: Array.isArray(child) ? child : [ child ],
            matchingText
          })))[0]
      }
      return null
    }).filter(Boolean)[0]

  /**
   * Format parameters into a command help section
   * @param  {String}           name         Name of the command
   * @param  {String}           description  What the command does
   * @param  {String}           usage        Example of the command
   * @param  {String}           options      Command options, formatted into Markdown table rows
   * @param  {[String]}         positionals  Positionals of the command
   * @param  {[Array<String>]}  subCommands  Subcommands of the command
   * @return {String}
   */
  const generateMarkdown = ({
    name, description, usage, options, positionals, subCommands
  }) => `
      ### ${name}(1)

      #### Abstract

      ${description}

      #### Usage

      \`\`\`sh
      ${usage}
      \`\`\`

      #### Options
      | Flag(s) | Description | Type | Default |
      |--|--|--|--|
      ${options}
      ${(() => {
    if (positionals) {
      return `

            #### Positionals
            | Name | Description | Type | Default |
            |--|--|--|--|
            ${positionals}

          `
    }
    return ''
  })()}
      ${(() => {
    if (subCommands && name !== parentCommand) {
      return `
            #### Subcommands
            | Subcommand | Description |
            |--|--|
            ${subCommands.join('\n')}
          `
    }
    return ''
  })()}
    `

  /**
   * Runs the given command with the `-h` flag and splits into sections
   * @param  {String}  name  CFS command to run
   * @return {String}        Response split by \n\n (each should be a different section)
   */
  const executeCommandHelp = async ({ path, command, subCommand }) => {
    const cmdPath = resolve(path, command)
    const commands = [ subCommand || null, '--help' ].filter(Boolean)

    try {
      const [ stdout, stderr ] = await pify(execFile, { multiArgs: true })(cmdPath, commands)

      return (stdout || stderr).split('\n\n')
    } catch (e) {
      console.error('Error occurred reading command: ', e)
      return null
    }
  }

  /**
   * Parse flags for required, default and type
   * @param  {String}  str  String to parse
   * @return {Object}       { type, required, defaultValue }
   */
  const parseSpecifiers = (str) => {
    // eslint-disable-next-line no-invalid-regex
    let specifiers = str.match(/(?<=\[)[^\[]+(?=\])/g) || []

    const [ type ] = specifiers.map((s) => {
      if (isType(s)) {
        return s
      }
      return null
    }).filter(Boolean)
    const required = specifiers.some(s => 'required' === s) || false
    const [ defaultValue ] = specifiers.map((s) => {
      if (s && s.includes('default')) {
        // Takes the second half of 'default: "something"' and strips spaces and quotes
        return s.split(':')[1].trim().replace(/"/g, '')
      }
      return null
    }).filter(Boolean)[0]

    return { type, required, defaultValue }
  }

  /**
   * Cleans up and formats text describing command options
   * @param  {String}  text  Options section text
   * @return {String}        Options in Markdown table row format
   */
  const formatOptions = (text) => {
    try {
      let lines = text
        .split('\n')
        .filter(opt => opt !== 'Options:')
        .filter(Boolean)

      // Containers for descriptions + type that are too long
      const overrun = [].fill(null, 0, 30)

      // Split the lines into `description` and `flags` (that order)
      lines = lines
        .map((str, index) => {
          // Parse each option to extract the flag(s) and the flag description
          const line = parse(str)
          const { description, flags } = line

          if (description && 0 === flags.length) {
            overrun[index - 1] = str
            return null
          }

          return line
        })

      overrun.forEach((str, index) => {
        if (str) {
          // Get the line that overran
          let overranLine
          if (lines[index]) {
            overranLine = lines[index]
          } else {
            // If you have a super, super long line or something...
            // I'm ignoring anything that has to go back two+, just write a shorter command
            overranLine = lines[index - 1]
          }

          const line = parse(str)

          overranLine.description += (` ${line.description}`)
        }
      })

      lines = lines.filter(Boolean).map(({
        flags, description, type, defaultValue, required
      }) => {
        description = description.replace(/\[.*/, '').trim()

        return [ required ? `**${flags}**` : flags, description, type, defaultValue ]
      })

      // Format into table rows and join into headerless table
      return lines.map(formatIntoTable).join('\n')
    } catch (e) {
      console.error('Error occurred while extracting options:', e)
      return null
    }

    function parse(str) {
      let [ description, ...flags ] = str.split(/(-?-([A-z]|-)+)/g).reverse()

      flags = flags.filter(f => Boolean(f) && f.trim().length > 0 && f.trim() !== ',' && '-' === f.trim()[0])
      description = removeTabs(description)

      const { type, required, defaultValue } = parseSpecifiers(description)

      return {
        flags, description, type, defaultValue, required
      }
    }
  }

  /**
   * Cleans up and formats text describing command positionals
   * @param  {String}  text  Positionals section text
   * @return {String}        Positionals in Markdown table row format
   */
  const formatPositionals = (text) => {
    try {
      let lines = text
        .split('\n')
        .filter(opt => opt !== 'Positionals:')
        .filter(Boolean)

      // Containers for descriptions + type that are too long
      const overrun = [].fill(null, 0, 30)

      // Split the lines into `description` and `flags` (that order)
      lines = lines
        .map((str, index) => {
          const line = parse(str)
          const { name, description } = line

          if ((name && !description) || '[' === description[0]) {
            overrun[index - 1] = str
            return null
          }
          return line
        })

      overrun.forEach((str, index) => {
        if (str) {
          // Get the line that overran
          const overranLine = lines[index]

          const line = parse(str)

          overranLine.description += (` ${line.name}`)
          overranLine.type = (line.description && line.description.replace(/\[|\]/g, '')) || ''
        }
      })

      lines = lines.filter(Boolean).map(({
        name, description, type, defaultValue, required
      }) => {
        description = description.replace(/\[.*/, '').trim()

        return [ required ? `**${name}**` : name, description, type, defaultValue ]
      })

      // Format into table rows and join into headerless table
      return lines.filter(Boolean).map(formatIntoTable).join('\n')
    } catch (e) {
      console.error('Error occurred while extracting positionals:', e)
      return null
    }

    /**
     * Parse line and break into components
     * @param  {String]}  str  String to parse
     * @return {Object}        Parsed components
     */
    function parse(str) {
      // Parse each option to extract the flag(s) and the flag description
      // eslint-disable-next-line prefer-const
      let [ name, description = '', type = '' ] = splitOnPseudoTab(str.trim())

      const { required, defaultValue, type: parsedType } = parseSpecifiers(`${type} ${description}`)

      return {
        name, description, type: parsedType, defaultValue, required
      }
    }
  }

  /**
   * Parse sections into table formats
   * @param  {String}  subCommands  Subcommands section text
   * @param  {String}  options      Options section text
   * @param  {String}  positionals  Positionals section text
   * @return {Object}               Object of parsed sections text
   */
  const extractCommandInfo = async ({ subCommands = '', options = '', positionals = '' }) => {
    try {
      let subCommandsHelp = []
      if (subCommands) {
        const lines = subCommands.split('\n')
        subCommands = lines.map((cmd) => {
          cmd = cmd.trim()

          let description
          // eslint-disable-next-line prefer-const
          [ cmd, description ] = splitOnPseudoTab(cmd)

          let [ command, subCommand ] = cmd.split(' ')

          if (command === parentCommand) {
            command = `${command}-${subCommand}`
            subCommand = null
          }

          commandDescriptions[`${command}${subCommand ? ` ${subCommand}` : ''}`] = description

          // If the subcommand has a brace, it is probably the parent command.
          //   This line prevents loops.
          if (subCommand && ('<' === subCommand[0] || '[' === subCommand[0])) {
            return null
          }
          // If the subcommand isn't a subcommand of the parent command,
          //   it is likely runover text
          if (command.slice(0, parentCommand.length) !== parentCommand) {
            return null
          }

          return { command, subCommand, description }
        }).filter(Boolean)

        subCommandsHelp = await Promise.all(subCommands.map(buildHelp))

        subCommands = subCommands.map(cmd => `|${cmd.command} ${cmd.subCommand}|${cmd.description}|`)
      }

      options = formatOptions(options)
      positionals = formatPositionals(positionals)

      return {
        options, positionals, subCommands, subCommandsHelp
      }
    } catch (e) {
      console.error('Error occurred while building help', e)
      return null
    }
  }

  /**
   * Writes text to a file at argv.output
   * @param  {String}    text  Text to write
   * @param  {[String]}  name  Name of the file to write
   */
  const write = (text, name = argv.name) => {
    console.log(`Writing ${name} to ${argv.output}`)
    fs.writeFileSync(resolve(argv.output, name), removeTabs(text))
  }

  /**
   * Gets the help section of a given command and, optionally, a subcommand
   * @param  {[String]}  path        Path of the command
   * @param  {String}    command     Name of the command
   * @param  {[String]}  subCommand  Name of the subcommand
   * @return {Object}                Object of the resulting text,
   *                                        in guessed sections
   */
  const getCommandHelp = async ({ path = argv.commandPath, command, subCommand }) => {
    const [ usage, description, options, etc ] = await executeCommandHelp({ path, command, subCommand })

    return {
      description,
      usage,
      options,
      etc
    }
  }

  /**
   * Take in somewhat unstructured sections, format and organize into proper section
   * @param  {String}    command     Name of the command
   * @param  {[String]}  subCommand  Name of the subcommand
   * @return {String}                Text of help
   */
  const buildHelp = async ({ command, subCommand }) => {
    const fullName = `${command}${subCommand ? ` ${subCommand}` : ''}`
    console.info(`Building CLI help for ${fullName}`)
    let {
      // eslint-disable-next-line prefer-const
      usage, options, description, etc
    } = await getCommandHelp({ path: argv.commandPath, command, subCommand })

    let subCommands = ''
    let positionals = ''
    if (command !== parentCommand) {
      subCommands = findMatching({ searchDomain: [ options, description, etc ], matchingText: 'Commands:' })
      positionals = findMatching({ searchDomain: [ options, description, etc ], matchingText: 'Positionals:' })
      options = findMatching({ searchDomain: [ options, description, etc ], matchingText: 'Options:' })
    } else {
      commandDescriptions[parentCommand] = `All other commands prepended with \`${parentCommand}-\` execute as a child of this command`
      subCommands = options
      options = etc
    }

    const {
      options: parsedOptions,
      positionals: parsedPositionals,
      subCommands: parsedSubCommands,
      subCommandsHelp
    } = await extractCommandInfo({ subCommands, options, positionals })

    const help = generateMarkdown({
      name: fullName,
      description: commandDescriptions[fullName],
      usage,
      options: parsedOptions,
      positionals: parsedPositionals,
      subCommands: parsedSubCommands
    })

    if (fullName === parentCommand) {
      return removePseudoTab([ help, ...subCommandsHelp ].join('\n---\n'))
    }
    return removePseudoTab([ help, ...subCommandsHelp ].join('\n'))
  }

  const files = fs.readdirSync(argv.commandPath)

  if (0 === files.length) {
    throw new Error(`Could not find any files in ${argv.commandPath}`)
  }

  if (!fs.existsSync(argv.output)) {
    fs.mkdirSync(argv.output)
  }

  [ parentCommand ] = files.sort((a, b) => a.length - b.length)

  console.log(`Setting \`${parentCommand}\` as 'parent command'`)

  const help = await buildHelp({ command: parentCommand })

  write(help)
}())
