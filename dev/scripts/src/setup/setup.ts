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
import { IDappAccount, IProviderAccount } from '@prosopo/types'
import { LogLevel, ProsopoEnvError, getLogger } from '@prosopo/common'
import { Payee } from '@prosopo/captcha-contract'
import { ProviderEnvironment } from '@prosopo/env'
import { ReturnNumber } from '@prosopo/typechain-types'
import { defaultConfig, getSecret } from '@prosopo/cli'
import { generateMnemonic, getPairAsync, wrapQuery } from '@prosopo/contract'
import { get } from '@prosopo/util'
import { getEnvFile } from '@prosopo/cli'
import { registerProvider } from './provider.js'
import { setupDapp } from './dapp.js'
import fse from 'fs-extra'
import path from 'path'

const logger = getLogger(LogLevel.enum.info, 'setup')
const __dirname = path.resolve()

// Take the root dir from the environment or assume it's the root of this package
function getRootDir() {
    const rootDir = process.env.ROOT_DIR || path.resolve(__dirname, '../..')
    logger.info('Root dir:', rootDir)
    return rootDir
}

function getDatasetFilePath() {
    const datasetFile = process.env.PROVIDER_DATASET_FILE || path.resolve('../data/captchas.json')
    logger.info('Dataset file:', datasetFile)
    return datasetFile
}

function getDefaultProvider(): IProviderAccount {
    return {
        url: process.env.API_PORT ? `http://localhost:${process.env.API_PORT}` : 'http://localhost:3000',
        fee: 10,
        payee: Payee.dapp,
        stake: Math.pow(10, 13),
        datasetFile: getDatasetFilePath(),
        address: process.env.PROVIDER_ADDRESS || '',
        secret: getSecret(),
        captchaDatasetId: '',
    }
}

function getDefaultDapp(): IDappAccount {
    return {
        secret: '//Eve',
        contractAccount: process.env.DAPP_SITE_KEY || '',
        fundAmount: Math.pow(10, 12),
    }
}

async function copyEnvFile() {
    try {
        const rootDir = getRootDir()
        // TODO move all env files to a single template location
        const tplLocation = path.resolve(rootDir, './dev/scripts')
        const tplEnvFile = getEnvFile(tplLocation, 'env')
        const envFile = getEnvFile(tplLocation, '.env')
        await fse.copy(tplEnvFile, envFile, { overwrite: false })
    } catch (err) {
        logger.debug(err)
    }
}

function updateEnvFileVar(source: string, name: string, value: string) {
    const envVar = new RegExp(`.*(${name}=)(.*)`, 'g')
    if (envVar.test(source)) {
        return source.replace(envVar, `$1${value}`)
    }
    return source + `\n${name}=${value}`
}

async function updateEnvFile(vars: Record<string, string>) {
    const rootDir = getRootDir()
    const envFile = getEnvFile(rootDir, '.env')

    let readEnvFile = await fse.readFile(envFile, 'utf8')

    for (const key in vars) {
        readEnvFile = updateEnvFileVar(readEnvFile, key, get(vars, key))
    }

    await fse.writeFile(envFile, readEnvFile)
}

async function registerDapp(env: ProviderEnvironment, dapp: IDappAccount) {
    await setupDapp(env, dapp)
}

export async function setup(force: boolean) {
    const defaultProvider = getDefaultProvider()
    const defaultDapp = getDefaultDapp()
    if (defaultProvider.secret) {
        const hasProviderAccount = defaultProvider.address && defaultProvider.secret
        logger.debug('ENVIRONMENT', process.env.NODE_ENV)

        const [mnemonic, address] = !hasProviderAccount
            ? await generateMnemonic()
            : [defaultProvider.secret, defaultProvider.address]

        logger.debug(`Address: ${address}`)
        logger.debug(`Mnemonic: ${mnemonic}`)
        logger.debug('Writing .env file...')
        await copyEnvFile()

        if (!process.env.DAPP_SITE_KEY) {
            throw new ProsopoEnvError('DEVELOPER.DAPP_SITE_KEY_MISSING')
        }

        const config = defaultConfig()
        const providerSecret = config.account.secret
        const network = config.networks[config.defaultNetwork]
        const pair = await getPairAsync(network, providerSecret)

        const env = new ProviderEnvironment(defaultConfig(), pair)
        await env.isReady()

        const result: ReturnNumber = await wrapQuery(
            env.getContractInterface().query.getDappStakeThreshold,
            env.getContractInterface().query
        )()
        const stakeAmount = result.rawNumber
        defaultDapp.fundAmount = stakeAmount.muln(2)
        defaultProvider.secret = mnemonic

        env.logger.info(`Registering provider... ${defaultProvider.address}`)

        defaultProvider.pair = await getPairAsync(network, providerSecret)

        await registerProvider(env, defaultProvider, force)

        defaultDapp.contractAccount = process.env.DAPP_SITE_KEY

        defaultDapp.pair = await getPairAsync(network, defaultDapp.secret)

        env.logger.info('Registering dapp...')
        await registerDapp(env, defaultDapp)

        if (!hasProviderAccount) {
            await updateEnvFile({
                PROVIDER_MNEMONIC: `"${mnemonic}"`,
                PROVIDER_ADDRESS: address,
            })
        }
        process.exit()
    } else {
        console.error('no secret found in .env file')
        throw new ProsopoEnvError(`GENERAL.NO_MNEMONIC_OR_SEED`)
    }
}

//if main process
// if (typeof require !== 'undefined' && require.main === module) {
//     console.info('Running setup as main process')
//
//     setup()
//         .then((r) => logger.debug('Setup done'))
//         .catch((e) => console.error(e))
// }
