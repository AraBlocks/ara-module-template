# Ara Module Template Command Line Guide

## Setup

### Developers
```sh
$ git clone git@github.com:AraBlocks/ara-module-template.git
$ cd ara-module-template
$ npm install && npm link
```

### Users
```sh
$ npm install arablocks/ara-module-template --global
```

## Usage
```sh
$ amt --help
usage: amt [-hDV] <command> [options]

Commands:
  amt create                      Create something
  amt command [positional]        Command something
  amt destroy [positional]        Destroy something

General Options:
  --help, -h     Show this help message
  --debug, -D    Enable debug output
  --version, -V  Show program version
```

## Commands
* [amt create](#amt-create)
* [amt command](#amt-command)
* [amt destroy](#amt-destroy)

<a name="amt-create"></a>
### 1. `amt create`
Create something on the command line.

```sh
$ amt create -h
usage: amt create [-D] [options]

General Options:
  --help, -h     Show this help message
  --debug, -D    Enable debug output
  --version, -V  Show program version
```

#### Example
```sh
$ amt create

This is what will print out when one runs `amt create`
```

<a name="amt-command"></a>
### 2. `amt command`
Command something on the command line.

```sh
$ amt command -h
usage: amt command [-D] [options]

Positionals:
  something  [default: 'something']

Specfic Options:
  --voption, -v  v option description  [required]
  --ioption, -i  i option description  [required]
  --poption, -p  p option description  [required]

General Options:
  --help, -h     Show this help message
  --debug, -D    Enable debug output
  --version, -V  Show program version
```

#### Example

```sh
$ amt command something \
              -v hello \
              -i world \
              -p "!"

This is what will print out when one runs `amt command`
```

<a name="amt-destroy"></a>
### 3. `amt destroy`
Destroy something on the command line.

```sh
$ amt destroy -h
usage: amt destroy [-D] [options]

Positionals:
  something  [default: 'something']

General Options:
  --help, -h     Show this help message
  --debug, -D    Enable debug output
  --version, -V  Show program version
```

#### Example
```sh
$ amt destroy something

This is what will print out when one runs `amt destroy`
```