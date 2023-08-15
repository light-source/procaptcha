// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { hexToU8a } from '@polkadot/util'
import { readdirSync } from 'fs'
import { spawn } from 'child_process'
import { stdin } from 'process'
import fs from 'fs'
import path from 'path'
import process from 'process'
import yargs from 'yargs'

const contractSrcFileExtension = '.rs'

// string to string map of env variables
interface Env {
    [key: string]: string
}

// add in the git commit to env
const getGitCommitId = async () => {
    // get the git commit id
    const gitCommitIdResult = await exec('git rev-parse HEAD')
    const gitCommitId = gitCommitIdResult.stdout.trim()
    // console.log("git commit id:", gitCommitId)
    const gitCommitIdBytes = hexToU8a(gitCommitId)
    // console.log("git commit id bytes:", gitCommitIdBytes)
    const gitCommitIdBytesString: string = '[' + gitCommitIdBytes.toString() + ']'
    // console.log("git commit id byte string:", gitCommitIdBytesString)
    return gitCommitIdBytesString
}

const setEnvVariable = (filePath: string, name: string, value: string) => {
    // console.log("setting env variable", name, "in", filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    let result = content
    // find and replace every declaration of the env variable
    // e.g.
    //
    // let ENV_ABC: u32 = 0;
    //
    // and ENV_ABC=3 in .env
    // becomes
    //
    // let ENV_ABC: u32 = 3;
    //

    name = 'env_' + name // add the env prefix to the name
    // names could be lower, upper or specific case
    for (const declaration of ['let', 'const']) {
        const regex = new RegExp(`${declaration}\\s+${name}:([^=]+)=[^;]+;`, 'gmsi')
        const regexMatch = regex.test(result)
        if (!regexMatch) {
            // console.log('no match for', regex, 'in', filePath);
            continue
        }
        // console.log('match for', regex, 'in', filePath);
        result = result.replaceAll(regex, `${declaration} ${name}:$1= ${value};`)
    }
    if (result === content) {
        // no change has been made
        return
    }
    console.log('set env variable', name, 'in', filePath)
    // else change has been made
    // then overwrite original file with the new content
    fs.writeFileSync(filePath, result)
}

const setEnvVariables = (filePath: string, env: Env) => {
    const stats = fs.lstatSync(filePath)
    if (stats.isDirectory()) {
        // recurse into directory
        const files = fs.readdirSync(filePath)
        files.forEach((file) => {
            setEnvVariables(path.join(filePath, file), env)
        })
    } else if (stats.isFile()) {
        // process file
        if (filePath.endsWith(contractSrcFileExtension)) {
            // loop through all env variables and set them
            for (const [name, value] of Object.entries(env)) {
                // env vars have to start with the correct prefix, otherwise normal env vars (e.g. PWD, EDITOR, SHELL, etc.) would be propagated into the contract, which is not desired
                setEnvVariable(filePath, name, value)
            }
        }
    } else {
        throw new Error(`Unknown file type: ${filePath}`)
    }
}

const exec = (
    command: string,
    pipe?: boolean
): Promise<{
    stdout: string
    stderr: string
    code: number | null
}> => {
    console.log(`> ${command}`)

    const prc = spawn(command, {
        shell: true,
    })

    if (pipe || pipe === undefined) {
        prc.stdout.pipe(process.stdout)
        prc.stderr.pipe(process.stderr)
    }
    stdin.pipe(prc.stdin)

    const stdoutData: string[] = []
    const stderrData: string[] = []
    prc.stdout.on('data', (data) => {
        stdoutData.push(data.toString())
    })
    prc.stderr.on('data', (data) => {
        stderrData.push(data.toString())
    })

    return new Promise((resolve, reject) => {
        prc.on('close', function (code) {
            const output = {
                stdout: stdoutData.join(''),
                stderr: stderrData.join(''),
                code,
            }
            if (code === 0) {
                resolve(output)
            } else {
                reject(output)
            }
        })
    })
}

export async function processArgs(args: string[]) {
    const repoDir = path.join(__dirname, '../..')
    const contractsDir = path.join(__dirname, '../../contracts')
    const cratesDir = path.join(__dirname, '../../crates')
    const contractsCiVersion = '3.0.1'
    const crates = readdirSync(cratesDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
    const contracts = readdirSync(contractsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
    const packages = [...crates, ...contracts]
    const outputDir = path.join(repoDir, 'target/ink')
    const ignoredContractsBuild = ['common_dev'] // contracts to ignore when building

    // set the env variables using find and replace
    const env: Env = {
        git_commit_id: await getGitCommitId(),
    }
    setEnvVariables(contractsDir, env)
    setEnvVariables(cratesDir, env)

    // console.log(`repoDir: ${repoDir}`)
    // console.log(`contractsDir: ${contractsDir}`)
    // console.log(`cratesDir: ${cratesDir}`)
    // console.log(`outputDir: ${outputDir}`)

    const getContractsToBuild = (contracts: string[]): string[] => {
        // ignore contracts which should not be built
        return contracts.filter((contract) => !ignoredContractsBuild.includes(contract))
    }

    const addPackageOption = (yargs: yargs.Argv, customPackages?: string[]) => {
        return yargs.option('package', {
            type: 'array',
            demand: false,
            desc: 'Target a specific crate/contract',
            default: customPackages || [],
            choices: customPackages || packages,
        })
    }

    const addToolchainOption = (yargs: yargs.Argv) => {
        return yargs.option('toolchain', {
            type: 'string',
            demand: false,
            desc: 'Use a specific toolchain',
            default: '',
        })
    }

    const addReleaseOption = (yargs: yargs.Argv) => {
        return yargs.option('release', {
            type: 'boolean',
            demand: false,
            desc: 'Build in release mode',
            default: false,
        })
    }

    const addFixOption = (yargs: yargs.Argv) => {
        return yargs.option('fix', {
            type: 'boolean',
            demand: false,
            desc: 'Fix the code',
            default: false,
        })
    }

    const addDockerOption = (yargs: yargs.Argv) => {
        return yargs.option('docker', {
            type: 'boolean',
            demand: false,
            desc: 'Use docker contracts-ci image to build instead of local toolchain',
            default: false,
        })
    }

    const pullDockerImage = async () => {
        // check if the docker image is already pulled
        try {
            await exec(`docker images -q prosopo/contracts-ci-linux:${contractsCiVersion}`)
        } catch (e: any) {
            // if not, pull it
            await exec(`docker pull prosopo/contracts-ci-linux:${contractsCiVersion}`)
        }
    }

    const execCargo = async (argv: yargs.Arguments<{}>, cmd: string, dir?: string) => {
        const rest = argv._.slice(1).join(' ') // remove the first arg (the command) to get the rest of the args
        const toolchain = argv.toolchain ? `+${argv.toolchain}` : ''
        const relDir = path.relative(repoDir, dir || '..')

        if (cmd.startsWith('contract') && argv.package) {
            throw new Error('Cannot run contract commands on specific packages')
        } else {
            for (const pkg of (argv.package as string[]) || []) {
                // add the package to the end of the cmd
                cmd = `${cmd} --package ${pkg}`
            }
        }

        let script = ''
        if (argv.docker) {
            const manifestPath = path.join('/repo', relDir, '/Cargo.toml')
            pullDockerImage()
            script = `docker run --rm -v ${repoDir}:/repo --entrypoint /bin/sh prosopo/contracts-ci-linux:${contractsCiVersion} -c 'cargo ${toolchain} ${cmd} --manifest-path=${manifestPath} ${rest}'`
        } else {
            script = `cargo ${toolchain} ${cmd} ${rest}`
            if (dir) {
                script = `cd ${dir} && ${script}`
            }
        }

        let error = false
        try {
            await exec(script)
        } catch (e: any) {
            // error should be printed to console in the exec function
            // error out after cleanup
            error = true
        }

        await new Promise((resolve, reject) => {
            if (error) {
                reject()
            } else {
                resolve({})
            }
        })
    }

    await yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .command(
            'chown',
            'Take ownership of any contract files/build artifacts post docker',
            (yargs) => {
                return yargs
            },
            async (argv) => {
                await exec(`cd ${repoDir} sudo chown -R $(whoami):$(whoami) ../target || true`)
            },
            []
        )
        .command(
            'clean',
            'Clean build artifacts',
            (yargs) => {
                return yargs
            },
            async (argv) => {
                await exec(`cd ${repoDir}/dev && npm run cli -- chown && rm -rf ../target`)
            },
            []
        )
        .command(
            'expand',
            'Expand the contract (processing all macros, etc)',
            (yargs) => {
                // cannot build crates
                yargs = addPackageOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const rest = argv._.slice(1) // remove the first arg (the command) to get the rest of the args
                const contract = argv.package
                await exec(
                    `cd ${repoDir} && mkdir -p expanded && cd ${contractsDir}/${contract} && cargo expand ${rest} > ${repoDir}/expanded/${contract}.rs`
                )
            },
            []
        )
        .command(
            'metadata',
            'Build the metadata',
            (yargs) => {
                // cannot build crates
                yargs = addPackageOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const rest = argv._.slice(1) // remove the first arg (the command) to get the rest of the args
                const contract = argv.package
                await exec(
                    `cd ${repoDir} && cargo metadata --manifest-path ${contractsDir}/${contract}/Cargo.toml ${rest}`
                )
            },
            []
        )
        .command(
            'instantiate',
            'Instantiate the contract',
            (yargs) => {
                // cannot build crates
                yargs = addPackageOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const rest = argv._.slice(1) // remove the first arg (the command) to get the rest of the args
                const contract = argv.package
                await exec(
                    `cd ${repoDir} && cargo contract instantiate target/ink/${contract}/${contract}.contract ${rest}`
                )
            },
            []
        )
        .command(
            'build',
            'Build the contracts',
            (yargs) => {
                // cannot build crates
                yargs = addPackageOption(yargs, contracts)
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                const contracts = getContractsToBuild(argv.package as string[])
                delete argv.package

                for (const contract of contracts) {
                    const contractPath = `${contractsDir}/${contract}`
                    await execCargo(argv, 'contract build', contractPath)
                }
            },
            []
        )
        .command(
            'test',
            'Test the crates and contracts',
            (yargs) => {
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                await execCargo(argv, 'test')
            },
            []
        )
        .command(
            'fmt',
            'Format the crates and contracts',
            (yargs) => {
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                yargs = yargs.option('check', {
                    type: 'boolean',
                    demand: false,
                    desc: 'Check the code instead of making changes',
                    default: false,
                })
                return yargs
            },
            async (argv) => {
                if (!argv._.includes('--all')) {
                    argv._.push('--all')
                }
                if (!argv._.includes('--verbose')) {
                    argv._.push('--verbose')
                }

                await execCargo(argv, 'fmt')
            },
            []
        )
        .command(
            'clippy',
            'Clippy the crates and contracts',
            (yargs) => {
                yargs = addToolchainOption(yargs)
                yargs = addDockerOption(yargs)
                return yargs
            },
            async (argv) => {
                argv._.push('-- -D warnings -A clippy::too_many_arguments')
                await execCargo(argv, 'clippy')
            },
            []
        )
        .parserConfiguration({ 'unknown-options-as-args': true })
        .parse()
}

processArgs(process.argv.slice(2))
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
